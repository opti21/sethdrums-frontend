import "server-only";
import { WatchError, withIsolatedRedis, withRedis } from "./redis";
import { prisma } from "./prisma";
import {
  mergeOrder,
  move,
  placeInGroup,
  withoutIds,
  type GroupEdge,
  type PrioKind,
} from "@/lib/shared/queue-order";

export { mergeOrder, move };

/**
 * The suggestion list state. It lives in one of two places, picked by
 * QUEUE_BACKEND:
 *
 * - "redis" (default): a RedisJSON document at `Queue:<QUEUE_ID>`, shared
 *   with the chat bot and written with WATCH/MULTI transactions.
 * - "do": the QueueRoom Durable Object in queue-worker/, reached over HTTPS
 *   at QUEUE_WORKER_URL. It applies one change at a time and tells open
 *   panels itself.
 *
 * Both keep the same field names, so either can be imported into the other.
 * The chat bot must use the same backend as the frontend.
 */
export type QueueState = {
  order: string[];
  is_updating: boolean;
  is_paused: boolean;
  being_updated_by: string;
  now_playing: string;
  is_open: boolean;
  currently_processing: string[];
  is_subOnly: boolean;
};

type QueueFlags = Partial<
  Pick<QueueState, "is_updating" | "is_paused" | "being_updated_by" | "now_playing" | "is_open" | "is_subOnly">
>;

export function queueBackend(): "redis" | "do" {
  return process.env.QUEUE_BACKEND === "do" ? "do" : "redis";
}

export function queueId() {
  const id = process.env.QUEUE_ID;
  if (!id) {
    throw new Error("QUEUE_ID is not set");
  }
  return id;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item != null && item !== "").map(String);
}

function normalize(raw: unknown): QueueState {
  if (!raw || typeof raw !== "object") {
    throw new Error("Queue document not found");
  }
  const doc = raw as Record<string, unknown>;
  return {
    order: stringArray(doc.order),
    currently_processing: stringArray(doc.currently_processing),
    now_playing: doc.now_playing == null ? "" : String(doc.now_playing),
    being_updated_by: typeof doc.being_updated_by === "string" ? doc.being_updated_by : "",
    is_updating: Boolean(doc.is_updating),
    is_paused: Boolean(doc.is_paused),
    is_open: Boolean(doc.is_open),
    is_subOnly: Boolean(doc.is_subOnly),
  };
}

// ---------------------------------------------------------------------------
// Durable Object backend

type DoReply = { state: QueueState; version: number; changed: boolean; result?: unknown };

/** Call the queue Worker. Also used by broadcast() for the realtime relay. */
export async function callQueueWorker<T>(path: "/rpc" | "/broadcast", body: Record<string, unknown>): Promise<T> {
  const base = process.env.QUEUE_WORKER_URL;
  const secret = process.env.QUEUE_WORKER_SECRET;
  if (!base || !secret) {
    throw new Error("QUEUE_WORKER_URL and QUEUE_WORKER_SECRET must be set");
  }
  const response = await fetch(new URL(path, base), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ room: queueId(), ...body }),
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(`Queue worker ${path} failed (${response.status}): ${data.error ?? "no body"}`);
  }
  return data;
}

async function doOp(op: Record<string, unknown>) {
  const reply = await callQueueWorker<DoReply>("/rpc", op);
  return { ...reply, state: normalize(reply.state) };
}

// ---------------------------------------------------------------------------
// Redis backend

function queueKey() {
  return `Queue:${queueId()}`;
}

type QueuePatch = Partial<Pick<QueueState, "order" | "currently_processing" | "now_playing">>;

/**
 * Read-modify-write on the Redis queue that can't lose a concurrent change.
 * The key is WATCHed, so if the chat bot, another mod or another request
 * writes it between our read and our write, the write is thrown away and
 * `change` runs again on the fresh state. Return null to write nothing.
 * Resolves to the state that was written, or null when nothing was.
 */
async function updateRedisQueue(change: (queue: QueueState) => QueuePatch | null): Promise<QueueState | null> {
  const key = queueKey();
  for (let attempt = 0; attempt < 8; attempt++) {
    const outcome = await withIsolatedRedis(async (redis) => {
      await redis.watch(key);
      const queue = normalize(await redis.json.get(key));
      const patch = change(queue);
      if (!patch) {
        await redis.unwatch();
        return { written: null };
      }
      const multi = redis.multi();
      for (const [field, value] of Object.entries(patch)) {
        multi.json.set(key, `$.${field}`, value as never);
      }
      try {
        await multi.exec();
      } catch (error) {
        if (error instanceof WatchError) return "retry" as const;
        throw error;
      }
      return { written: { ...queue, ...patch } };
    });
    if (outcome !== "retry") return outcome.written;
    // Small random wait so racing writers don't collide again in lockstep.
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40 * (attempt + 1)));
  }
  throw new Error("The suggestion list is changing too fast, try again");
}

async function setRedisFields(fields: QueueFlags) {
  const key = queueKey();
  await withRedis(async (redis) => {
    const multi = redis.multi();
    for (const [field, value] of Object.entries(fields)) {
      multi.json.set(key, `$.${field}`, value as never);
    }
    await multi.exec();
  });
}

// ---------------------------------------------------------------------------
// Public operations. Callers don't know which backend is in use.

export async function getQueue(): Promise<QueueState> {
  if (queueBackend() === "do") {
    return (await doOp({ op: "get" })).state;
  }
  return normalize(await withRedis((redis) => redis.json.get(queueKey())));
}

/**
 * Saves a mod's reorder without losing changes made since their panel last
 * loaded: ids that left the queue are dropped, and ids added since (by chat
 * or another mod) keep their current place instead of vanishing.
 */
export async function saveReorder(submitted: string[]) {
  if (queueBackend() === "do") {
    await doOp({ op: "reorder", order: submitted });
    return;
  }
  await updateRedisQueue((queue) => ({ order: mergeOrder(queue.order, submitted) }));
}

export async function addToQueue(requestId: string | number) {
  const id = String(requestId);
  if (queueBackend() === "do") {
    await doOp({ op: "add", id });
    return;
  }
  await updateRedisQueue((queue) => (queue.order.includes(id) ? null : { order: [...queue.order, id] }));
}

export async function removeFromOrder(...requestIds: (string | number)[]) {
  const ids = requestIds.map(String);
  if (ids.length === 0) return;
  if (queueBackend() === "do") {
    await doOp({ op: "remove", ids });
    return;
  }
  await updateRedisQueue((queue) => {
    const next = withoutIds(queue.order, ids);
    return next.length === queue.order.length ? null : { order: next };
  });
}

/** Move a request to `index` in the live order. False if it left the queue. */
export async function moveInOrder(requestId: string | number, index: number) {
  const id = String(requestId);
  if (queueBackend() === "do") {
    return (await doOp({ op: "move", id, index })).result === true;
  }
  let found = false;
  await updateRedisQueue((queue) => {
    const from = queue.order.indexOf(id);
    found = from !== -1;
    return found ? { order: move(queue.order, from, index) } : null;
  });
  return found;
}

/** The priority kind of every request in `ids`, from the database. */
async function prioKinds(ids: string[]): Promise<Record<string, PrioKind>> {
  const numeric = ids.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id));
  if (numeric.length === 0) return {};
  const rows = await prisma.request.findMany({
    where: { id: { in: numeric }, OR: [{ priority: true }, { mod_prio: true }] },
    select: { id: true, priority: true, mod_prio: true },
  });
  return Object.fromEntries(rows.map((row) => [String(row.id), row.priority ? "priority" : "mod_prio"]));
}

/**
 * Put a request at the start or end of its priority group, inserting it if
 * it isn't listed (return to queue). The slot comes from where priority songs
 * actually sit in the live order (see placeInGroup), so stale ids or a song a
 * mod dragged can't shift it.
 */
export async function placeRequest(requestId: string | number, kind: PrioKind, edge: GroupEdge) {
  const id = String(requestId);
  const kinds = await prioKinds((await getQueue()).order.filter((item) => item !== id));
  if (queueBackend() === "do") {
    await doOp({ op: "place", id, kind, edge, kinds });
    return;
  }
  await updateRedisQueue((queue) => ({ order: placeInGroup(queue.order, kinds, id, kind, edge) }));
}

export async function setNowPlaying(requestId: string | number | "") {
  await setQueueFields({ now_playing: String(requestId) });
}

export async function setQueueFields(fields: QueueFlags) {
  if (queueBackend() === "do") {
    await doOp({ op: "setFields", fields });
    return;
  }
  await setRedisFields(fields);
}

/** Mark a request as being changed. False if someone else already has it. */
export async function claimProcessing(requestId: string) {
  if (queueBackend() === "do") {
    return (await doOp({ op: "claim", id: requestId })).result === true;
  }
  const written = await updateRedisQueue((queue) =>
    queue.currently_processing.includes(requestId)
      ? null
      : { currently_processing: [...queue.currently_processing, requestId] }
  );
  return written !== null;
}

export async function releaseProcessing(requestId: string) {
  if (queueBackend() === "do") {
    await doOp({ op: "release", id: requestId });
    return;
  }
  await updateRedisQueue((queue) =>
    queue.currently_processing.includes(requestId)
      ? { currently_processing: queue.currently_processing.filter((item) => item !== requestId) }
      : null
  );
}
