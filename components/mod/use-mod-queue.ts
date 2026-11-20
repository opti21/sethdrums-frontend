"use client";

import Pusher, { type PresenceChannel } from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client/api";
import type { ModQueue } from "@/lib/shared/types";

export type OnlineMod = { id: string; username: string; picture?: string };

type MemberInfo = { username?: string; picture?: string };

type Live = {
  setConnected: (connected: boolean) => void;
  setModsOnline: (update: OnlineMod[] | ((list: OnlineMod[]) => OnlineMod[])) => void;
  onEvent: (event: string, data: unknown) => void;
  refresh: () => Promise<void>;
};

/** Live updates and presence over the Pusher presence channel. */
function connectPusher({ setConnected, setModsOnline, onEvent, refresh }: Live) {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const channelName = process.env.NEXT_PUBLIC_PUSHER_CHANNEL;
  if (!key || !channelName) {
    console.warn("Pusher is not configured; falling back to polling");
    return () => {};
  }
  const pusher = new Pusher(key, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2",
    channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
  });
  const channel = pusher.subscribe(channelName) as PresenceChannel;

  const toMod = (member: { id: string; info: MemberInfo }): OnlineMod => ({
    id: member.id,
    username: member.info?.username ?? "mod",
    picture: member.info?.picture,
  });

  channel.bind("pusher:subscription_succeeded", () => {
    setConnected(true);
    const list: OnlineMod[] = [];
    channel.members.each((member: { id: string; info: MemberInfo }) => list.push(toMod(member)));
    setModsOnline(list);
    void refresh();
  });
  channel.bind("pusher:subscription_error", (status: unknown) => {
    console.error("Pusher subscription failed", status);
    setConnected(false);
  });
  channel.bind("pusher:member_added", (member: { id: string; info: MemberInfo }) => {
    setModsOnline((list) => [...list.filter((m) => m.id !== member.id), toMod(member)]);
  });
  channel.bind("pusher:member_removed", (member: { id: string }) => {
    setModsOnline((list) => list.filter((m) => m.id !== member.id));
  });
  for (const event of ["lock-queue", "unlock-queue", "update-queue", "queue-add", "request-updated"]) {
    channel.bind(event, (data: unknown) => onEvent(event, data));
  }
  pusher.connection.bind("state_change", ({ current }: { current: string }) => {
    setConnected(current === "connected");
  });

  return () => {
    channel.unbind_all();
    pusher.unsubscribe(channelName);
    pusher.disconnect();
  };
}

type SocketMessage =
  | { type: "hello"; version: number; members: OnlineMod[] }
  | { type: "members"; members: OnlineMod[] }
  | { type: "event"; event: string; data: unknown };

/**
 * Live updates and presence from the queue Durable Object. Reconnects with
 * backoff, asking for a fresh token each time, and pings every 30 seconds so
 * proxies don't close an idle socket.
 */
function connectQueueSocket({ setConnected, setModsOnline, onEvent, refresh }: Live) {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let pingTimer: ReturnType<typeof setInterval> | undefined;

  const retry = () => {
    if (closed) return;
    setConnected(false);
    clearInterval(pingTimer);
    const delay = Math.min(30_000, 1_000 * 2 ** attempt) * (0.5 + Math.random() / 2);
    attempt += 1;
    retryTimer = setTimeout(() => void open(), delay);
  };

  const open = async () => {
    let url: string | undefined;
    try {
      url = (await api<{ backend: string; url?: string }>("/api/realtime/token")).url;
    } catch {
      // Not reachable or signed out; try again later.
    }
    if (closed) return;
    if (!url) {
      retry();
      return;
    }
    const ws = new WebSocket(url);
    socket = ws;
    ws.onmessage = (message) => {
      if (message.data === "pong") return;
      let data: SocketMessage;
      try {
        data = JSON.parse(String(message.data)) as SocketMessage;
      } catch {
        return;
      }
      if (data.type === "hello") {
        attempt = 0;
        setConnected(true);
        setModsOnline(data.members);
        void refresh();
      } else if (data.type === "members") {
        setModsOnline(data.members);
      } else if (data.type === "event") {
        onEvent(data.event, data.data);
      }
    };
    ws.onopen = () => {
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 30_000);
    };
    ws.onclose = () => {
      if (socket === ws) retry();
    };
  };

  void open();

  return () => {
    closed = true;
    clearTimeout(retryTimer);
    clearInterval(pingTimer);
    socket?.close(1000, "panel closed");
  };
}

/**
 * Loads the mod queue and keeps it live over Pusher or the queue Worker's
 * WebSocket, whichever the server picks.
 * Also polls every 20 seconds (5 while the socket is down), so a dropped socket can never leave the
 * panel stuck on old data.
 */
export function useModQueue(me: string) {
  const [queue, setQueue] = useState<ModQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modsOnline, setModsOnline] = useState<OnlineMod[]>([]);
  const [lockedBy, setLockedBy] = useState("");
  const [connected, setConnected] = useState(false);
  const draggingRef = useRef(false);
  // Saves in flight from this panel (prio, play, return). Live events that
  // arrive meanwhile wait, so a fetch taken halfway through the server's
  // steps can't flash an in-between list over the optimistic one.
  const pending = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);
  // Set when a refresh is asked for while one is already running, so the
  // events that arrive mid-fetch still get a fetch that starts after them.
  const stale = useRef(false);
  // Bumped by local edits (like a drag) so an older fetch can't undo them.
  const generation = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    // Don't overwrite an optimistic change while this mod is mid-drag or
    // mid-save; the caller refreshes once its save lands.
    if (draggingRef.current || pending.current > 0) {
      stale.current = true;
      return;
    }
    if (inflight.current) {
      stale.current = true;
      return inflight.current;
    }
    inflight.current = (async () => {
      do {
        stale.current = false;
        const started = generation.current;
        try {
          const data = await api<ModQueue>("/api/mod/queue");
          if (started === generation.current && !draggingRef.current && pending.current === 0) setQueue(data);
          else stale.current = true;
          setError(null);
        } catch (err) {
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            setError("Only mods can see this page. Try signing in again.");
            stale.current = false;
          } else {
            setError("Couldn't reach the server. Retrying...");
            stale.current = false;
          }
        }
      } while (stale.current && !draggingRef.current && pending.current === 0);
      inflight.current = null;
    })();
    return inflight.current;
  }, []);

  /** Call before an optimistic local change so in-flight fetches are discarded. */
  const markLocalChange = useCallback(() => {
    generation.current += 1;
  }, []);

  /** Run a save with live refreshes held until it finishes, then refresh. */
  const whileSaving = useCallback(
    async <T,>(save: () => Promise<T>): Promise<T> => {
      pending.current += 1;
      try {
        return await save();
      } finally {
        pending.current -= 1;
        if (pending.current === 0) void refresh();
      }
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), connected ? 20_000 : 5_000);
    return () => clearInterval(timer);
  }, [refresh, connected]);

  useEffect(() => {
    // Same handling whichever service delivers the event.
    const onEvent = (event: string, data: unknown) => {
      switch (event) {
        case "lock-queue":
          setLockedBy((data as { beingUpdatedBy?: string } | null)?.beingUpdatedBy ?? "");
          break;
        case "unlock-queue":
          setLockedBy("");
          void refresh();
          break;
        case "update-queue":
          void refresh();
          break;
        case "queue-add":
          toast.info("New suggestion added", { id: "new-song" });
          void refresh();
          break;
        case "request-updated":
          toast.info("Someone replaced their suggestion", { id: "updated-request" });
          void refresh();
          break;
      }
    };

    let stop = () => {};
    let cancelled = false;
    // The server says which service to use, so it can switch without a rebuild.
    api<{ backend: "pusher" | "do"; url?: string }>("/api/realtime/token")
      .catch(() => ({ backend: "pusher" as const, url: undefined }))
      .then((config) => {
        if (cancelled) return;
        stop =
          config.backend === "do"
            ? connectQueueSocket({ setConnected, setModsOnline, onEvent, refresh })
            : connectPusher({ setConnected, setModsOnline, onEvent, refresh });
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [refresh]);

  const lockedByOther = lockedBy !== "" && lockedBy !== me;

  return {
    queue,
    setQueue,
    error,
    refresh,
    modsOnline,
    lockedBy,
    lockedByOther,
    connected,
    draggingRef,
    markLocalChange,
    whileSaving,
  };
}
