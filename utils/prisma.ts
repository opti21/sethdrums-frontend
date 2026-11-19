import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const QUERY_TIMEOUT_MS = 10_000;
const SLOW_QUERY_MS = 2_000;

// Talk to Turso over plain HTTPS instead of a long-lived WebSocket. A
// WebSocket that goes silent (half-open) never errors, so every query on it
// waits forever and the request dies at Cloudflare with a 524.
function toHttpUrl(url: string | undefined) {
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }
  return url.replace(/^libsql:\/\//, "https://").replace(/^wss:\/\//, "https://");
}

// The libSQL client has no request timeout of its own. It hands us a
// node-fetch style Request, so rebuild it for Node's built-in fetch.
async function fetchWithTimeout(input: any, init?: RequestInit) {
  const signal = AbortSignal.timeout(QUERY_TIMEOUT_MS);
  if (typeof input === "string" || input instanceof URL) {
    return fetch(input, { ...init, signal });
  }
  const method = input.method ?? "GET";
  const body =
    method === "GET" || method === "HEAD" ? undefined : await input.text();
  return fetch(input.url, {
    method,
    headers: Object.fromEntries(input.headers.entries()),
    body,
    signal,
  });
}

function createPrisma() {
  const libsql = createClient({
    url: toHttpUrl(process.env.TURSO_DATABASE_URL),
    authToken: process.env.TURSO_AUTH_TOKEN,
    fetch: fetchWithTimeout,
  });

  return new PrismaClient({ adapter: new PrismaLibSQL(libsql) }).$extends({
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

type ExtendedPrisma = ReturnType<typeof createPrisma>;

declare global {
  var prisma: ExtendedPrisma | undefined;
}

const prisma = global.prisma || createPrisma();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;
