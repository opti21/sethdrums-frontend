"use client";

import Pusher, { type PresenceChannel } from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client/api";
import type { ModQueue } from "@/lib/shared/types";

export type OnlineMod = { id: string; username: string; picture?: string };

type MemberInfo = { username?: string; picture?: string };

/**
 * Loads the mod queue and keeps it live over the Pusher presence channel.
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
  const inflight = useRef<Promise<void> | null>(null);
  // Set when a refresh is asked for while one is already running, so the
  // events that arrive mid-fetch still get a fetch that starts after them.
  const stale = useRef(false);
  // Bumped by local edits (like a drag) so an older fetch can't undo them.
  const generation = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    // Don't overwrite an optimistic reorder while this mod is mid-drag.
    if (draggingRef.current) {
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
          if (started === generation.current && !draggingRef.current) setQueue(data);
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
      } while (stale.current && !draggingRef.current);
      inflight.current = null;
    })();
    return inflight.current;
  }, []);

  /** Call before an optimistic local change so in-flight fetches are discarded. */
  const markLocalChange = useCallback(() => {
    generation.current += 1;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), connected ? 20_000 : 5_000);
    return () => clearInterval(timer);
  }, [refresh, connected]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const channelName = process.env.NEXT_PUBLIC_PUSHER_CHANNEL;
    if (!key || !channelName) {
      console.warn("Pusher is not configured; falling back to polling");
      return;
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
    channel.bind("lock-queue", (data: { beingUpdatedBy?: string }) => {
      setLockedBy(data?.beingUpdatedBy ?? "");
    });
    channel.bind("unlock-queue", () => {
      setLockedBy("");
      void refresh();
    });
    channel.bind("update-queue", () => void refresh());
    channel.bind("queue-add", () => {
      toast.info("New suggestion added", { id: "new-song" });
      void refresh();
    });
    channel.bind("request-updated", () => {
      toast.info("Someone replaced their suggestion", { id: "updated-request" });
      void refresh();
    });
    pusher.connection.bind("state_change", ({ current }: { current: string }) => {
      setConnected(current === "connected");
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
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
  };
}
