import "server-only";
import { createClient } from "redis";

export { WatchError } from "redis";

const TIMEOUT_MS = 5_000;

type RedisClient = ReturnType<typeof createClient>;

const globalForRedis = globalThis as unknown as {
  redis?: RedisClient;
  redisConnecting?: Promise<RedisClient>;
};

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), TIMEOUT_MS);
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

function drop(client: RedisClient) {
  if (globalForRedis.redis === client) {
    globalForRedis.redis = undefined;
  }
  client.destroy();
}

async function open(): Promise<RedisClient> {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  const client = createClient({
    url,
    // Fail commands while the socket is down instead of queueing them
    // until a reconnect that may never come.
    disableOfflineQueue: true,
    socket: {
      connectTimeout: TIMEOUT_MS,
      reconnectStrategy: false,
    },
  });

  client.on("error", (error) => {
    console.error("[redis] client error", error);
  });
  client.on("end", () => {
    if (globalForRedis.redis === client) {
      globalForRedis.redis = undefined;
    }
  });

  try {
    await withTimeout(client.connect(), "Redis connection timed out");
  } catch (error) {
    client.destroy();
    throw error;
  }

  globalForRedis.redis = client;
  return client;
}

async function getClient(): Promise<RedisClient> {
  const existing = globalForRedis.redis;
  if (existing?.isReady) {
    return existing;
  }
  if (!globalForRedis.redisConnecting) {
    globalForRedis.redisConnecting = open().finally(() => {
      globalForRedis.redisConnecting = undefined;
    });
  }
  return globalForRedis.redisConnecting;
}

/**
 * Run one Redis call with a hard timeout. A command that times out throws
 * away the connection so the next request starts on a fresh socket.
 */
export async function withRedis<T>(fn: (client: RedisClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    return await withTimeout(fn(client), "Redis command timed out");
  } catch (error) {
    if (error instanceof Error && error.message === "Redis command timed out") {
      console.error("[redis] command timed out, dropping connection");
      drop(client);
    }
    throw error;
  }
}

/**
 * Run a WATCH/MULTI transaction on its own short-lived connection, so the
 * WATCH can't be cleared by other requests sharing the main connection.
 */
export async function withIsolatedRedis<T>(fn: (client: RedisClient) => Promise<T>): Promise<T> {
  const client = (await getClient()).duplicate();
  try {
    await withTimeout(client.connect(), "Redis connection timed out");
    return await withTimeout(fn(client), "Redis command timed out");
  } finally {
    client.destroy();
  }
}
