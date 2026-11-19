import "server-only";
import { withRedis } from "./redis";

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

export async function addToQueue(requestId: string | number) {
  const queue = await getQueue();
  await setOrder([...queue.order, String(requestId)]);
}

export async function removeFromOrder(requestId: string | number) {
  const id = String(requestId);
  const queue = await getQueue();
  await setOrder(queue.order.filter((item) => item !== id));
}

export async function setNowPlaying(requestId: string | number | "") {
  await setField("$.now_playing", String(requestId));
}

export async function setProcessing(requestId: string, processing: boolean) {
  const queue = await getQueue();
  const rest = queue.currently_processing.filter((item) => item !== requestId);
  await setField(
    "$.currently_processing",
    processing ? [...rest, requestId] : rest
  );
}

/** Move one entry of a list to a new index. */
export function move<T>(list: T[], from: number, to: number): T[] {
  const result = [...list];
  const [item] = result.splice(from, 1);
  result.splice(Math.max(0, to), 0, item);
  return result;
}
