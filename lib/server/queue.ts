import "server-only";
import { WatchError, withIsolatedRedis, withRedis } from "./redis";

/**
 * The suggestion list state lives in Redis as a RedisJSON document at
 * `Queue:<QUEUE_ID>`. The chat bot reads and writes the same document with
 * redis-om, so the key and field names here must not change.
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

function queueKey() {
  const id = process.env.QUEUE_ID;
  if (!id) {
    throw new Error("QUEUE_ID is not set");
  }
  return `Queue:${id}`;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item != null && item !== "").map(String);
}

function normalize(raw: unknown): QueueState {
  if (!raw || typeof raw !== "object") {
    throw new Error("Queue document not found in Redis");
  }
  const doc = raw as Record<string, unknown>;
  return {
    order: stringArray(doc.order),
    currently_processing: stringArray(doc.currently_processing),
    now_playing: typeof doc.now_playing === "string" ? doc.now_playing : "",
    being_updated_by:
      typeof doc.being_updated_by === "string" ? doc.being_updated_by : "",
    is_updating: Boolean(doc.is_updating),
    is_paused: Boolean(doc.is_paused),
    is_open: Boolean(doc.is_open),
    is_subOnly: Boolean(doc.is_subOnly),
  };
}

export async function getQueue(): Promise<QueueState> {
  const raw = await withRedis((redis) => redis.json.get(queueKey()));
  return normalize(raw);
}

async function setField(path: string, value: unknown) {
  await withRedis((redis) =>
    redis.json.set(queueKey(), path, value as any)
  );
}

export async function setOrder(order: string[]) {
  await setField("$.order", stringArray(order));
}

type QueuePatch = Partial<Pick<QueueState, "order" | "currently_processing" | "now_playing">>;

/**
 * Read-modify-write on the queue that can't lose a concurrent change. The
 * key is WATCHed, so if the chat bot, another mod or another request writes
 * it between our read and our write, the write is thrown away and `change`
 * runs again on the fresh state. Return null from `change` to write nothing.
 * Resolves to the state that was written, or null when nothing was.
 */
export async function updateQueue(change: (queue: QueueState) => QueuePatch | null): Promise<QueueState | null> {
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

/** Merge a mod's reorder with the live order: see {@link saveReorder}. */
export function mergeOrder(current: string[], submitted: string[]) {
  const live = new Set(current);
  const order = [...new Set(submitted)].filter((id) => live.has(id));
  const seen = new Set(order);
  current.forEach((id, index) => {
    if (!seen.has(id)) order.splice(Math.min(index, order.length), 0, id);
  });
  return order;
}

/**
 * Saves a mod's reorder without losing changes made since their panel last
 * loaded: ids that left the queue are dropped, and ids added since (by chat
 * or another mod) keep their current place instead of vanishing.
 */
export async function saveReorder(submitted: string[]) {
  await updateQueue((queue) => ({ order: mergeOrder(queue.order, submitted) }));
}

export async function addToQueue(requestId: string | number) {
  const id = String(requestId);
  await updateQueue((queue) => (queue.order.includes(id) ? null : { order: [...queue.order, id] }));
}

export async function removeFromOrder(requestId: string | number) {
  const id = String(requestId);
  await updateQueue((queue) =>
    queue.order.includes(id) ? { order: queue.order.filter((item) => item !== id) } : null
  );
}

/** Move a request to `index` in the live order. No-op if it left the queue. */
export async function moveInOrder(requestId: string | number, index: number) {
  const id = String(requestId);
  await updateQueue((queue) => {
    const from = queue.order.indexOf(id);
    return from === -1 ? null : { order: move(queue.order, from, index) };
  });
}

export async function setNowPlaying(requestId: string | number | "") {
  await setField("$.now_playing", String(requestId));
}

/** Mark a request as being changed. False if someone else already has it. */
export async function claimProcessing(requestId: string) {
  const written = await updateQueue((queue) =>
    queue.currently_processing.includes(requestId)
      ? null
      : { currently_processing: [...queue.currently_processing, requestId] }
  );
  return written !== null;
}

export async function releaseProcessing(requestId: string) {
  await updateQueue((queue) =>
    queue.currently_processing.includes(requestId)
      ? { currently_processing: queue.currently_processing.filter((item) => item !== requestId) }
      : null
  );
}

/** Move one entry of a list to a new index. */
export function move<T>(list: T[], from: number, to: number): T[] {
  const result = [...list];
  const [item] = result.splice(from, 1);
  result.splice(Math.max(0, to), 0, item);
  return result;
}
