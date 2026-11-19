import "server-only";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/lib/generated/prisma/client";

const QUERY_TIMEOUT_MS = 10_000;
const SLOW_QUERY_MS = 2_000;

// Turso is reached over plain HTTPS instead of a long-lived WebSocket. A
// WebSocket that goes quiet never errors, so every query on it would wait
// forever and the request would die at Cloudflare with a 524.
function toHttpUrl(url: string | undefined) {
  if (!url) {
    // Don't crash at import (next build loads this without secrets).
    // Queries fail with a clear connection error instead.
    console.error("[prisma] TURSO_DATABASE_URL is not set");
    return "https://turso-url-not-set.invalid";
  }
  return url.replace(/^(libsql|wss):\/\//, "https://");
}

// The libSQL client has no request timeout of its own.
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const signal = AbortSignal.timeout(QUERY_TIMEOUT_MS);
  if (input instanceof Request) {
    return fetch(new Request(input, { signal }));
  }
  return fetch(input, { ...init, signal });
}

function createPrisma() {
  const adapter = new PrismaLibSql({
    url: toHttpUrl(process.env.TURSO_DATABASE_URL),
    authToken: process.env.TURSO_AUTH_TOKEN,
    fetch: fetchWithTimeout,
  });

  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const started = Date.now();
        try {
          return await query(args);
        } catch (error) {
          console.error(
            `[prisma] ${model}.${operation} failed after ${Date.now() - started}ms`,
            error
          );
          throw error;
        } finally {
          const elapsed = Date.now() - started;
          if (elapsed > SLOW_QUERY_MS) {
            console.warn(`[prisma] slow query ${model}.${operation}: ${elapsed}ms`);
          }
        }
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrisma>;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
