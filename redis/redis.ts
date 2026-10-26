import { createClient } from "redis";
import { Client } from "redis-om";

export const client = new Client();

const CONNECT_TIMEOUT_MS = 5_000;

type Redis = ReturnType<typeof createClient>;

let redis: Redis | undefined;
let opening: Promise<void> | undefined;

// One connection attempt at a time. redis-om marks itself open before the
// socket is ready, and node-redis waits forever for a reply, so a stuck
// Redis made every queue request hang.
export function connect(): Promise<void> {
  if (redis?.isOpen) {
    return Promise.resolve();
  }

  if (!opening) {
    opening = openRedis().finally(() => {
      opening = undefined;
    });
  }

  return opening;
}

async function openRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  await discardRedis();

  const next = createClient({
    url,
    // Reject commands while the socket is down instead of parking them
    // until a reconnect that may never succeed.
    disableOfflineQueue: true,
    socket: {
      connectTimeout: CONNECT_TIMEOUT_MS,
      // node-redis 4 only stops retrying when this returns an Error.
      // Anything else, including the socket error, is treated as a delay.
      reconnectStrategy: () => new Error("Redis connection lost"),
    },
  });

  next.on("error", (error) => {
    console.error("Redis client error", error);
  });

  const sendCommand = next.sendCommand.bind(next);
  next.sendCommand = (async (args, options) => {
    try {
      return await withTimeout(
        sendCommand(args, options),
        CONNECT_TIMEOUT_MS,
        "Redis command timed out"
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Redis command timed out") {
        if (redis === next) {
          redis = undefined;
        }
        detachOmClient();
        await safeDisconnect(next);
      }
      throw error;
    }
  }) as typeof next.sendCommand;

  try {
    await withTimeout(
      next.connect(),
      CONNECT_TIMEOUT_MS,
      "Redis connection timed out"
    );
    redis = next;
    await client.use(next);
  } catch (error) {
    await safeDisconnect(next);
    throw error;
  }
}

async function discardRedis() {
  const current = redis;
  redis = undefined;
  // Drop redis-om's shim before closing. Its close() calls quit(), which
  // waits for a reply, and it keeps the dead shim if quit throws.
  detachOmClient();
  if (current) {
    await safeDisconnect(current);
  }
}

function detachOmClient() {
  (client as { shim?: unknown }).shim = undefined;
}

async function safeDisconnect(connection: Redis) {
  try {
    // disconnect() is async and rejects when the socket is already gone.
    await connection.disconnect();
  } catch {
    // Already closed.
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
