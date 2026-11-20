#!/usr/bin/env node
/**
 * Move the suggestion list between Redis and the queue Durable Object.
 *
 *   doppler run -- node scripts/queue-migrate.mjs import [--force]
 *     Copy Redis `Queue:<QUEUE_ID>` into the Durable Object. Refuses if the
 *     Durable Object already has data, unless --force.
 *   doppler run -- node scripts/queue-migrate.mjs export
 *     Copy the Durable Object back into Redis (rollback).
 *   doppler run -- node scripts/queue-migrate.mjs compare
 *     Print both, to check they match.
 *
 * Needs REDIS_URL, QUEUE_ID, QUEUE_WORKER_URL, QUEUE_WORKER_SECRET.
 * Close the list in chat (!close) first so nothing changes mid-copy.
 */
import { createClient } from "redis";

const [command, flag] = process.argv.slice(2);
const { REDIS_URL, QUEUE_ID, QUEUE_WORKER_URL, QUEUE_WORKER_SECRET } = process.env;
for (const [name, value] of Object.entries({ REDIS_URL, QUEUE_ID, QUEUE_WORKER_URL, QUEUE_WORKER_SECRET })) {
  if (!value) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
}
const key = `Queue:${QUEUE_ID}`;

async function worker(op) {
  const response = await fetch(new URL("/rpc", QUEUE_WORKER_URL), {
    method: "POST",
    headers: { Authorization: `Bearer ${QUEUE_WORKER_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify({ room: QUEUE_ID, ...op }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Worker said ${response.status}: ${body.error ?? "no body"}`);
  return body;
}

const redis = createClient({ url: REDIS_URL, socket: { connectTimeout: 5_000, reconnectStrategy: false } });
await redis.connect();
try {
  if (command === "import") {
    const state = await redis.json.get(key);
    if (!state) throw new Error(`${key} not found in Redis`);
    const result = await worker({ op: "import", state, force: flag === "--force" });
    console.log(`Imported ${result.state.order.length} songs (version ${result.version}).`);
  } else if (command === "export") {
    const { state } = await worker({ op: "export" });
    await redis.json.set(key, "$", state);
    console.log(`Wrote ${state.order.length} songs back to Redis.`);
  } else if (command === "compare") {
    const [fromRedis, fromWorker] = [await redis.json.get(key), (await worker({ op: "get" })).state];
    console.log(JSON.stringify({ redis: fromRedis, worker: fromWorker }, null, 2));
    const same = JSON.stringify(fromRedis?.order ?? []) === JSON.stringify(fromWorker.order);
    console.log(same ? "Order matches." : "Order differs.");
  } else {
    console.error("Usage: node scripts/queue-migrate.mjs import [--force] | export | compare");
    process.exitCode = 1;
  }
} finally {
  await redis.close();
}
