import { QueueRoom, type QueueOp } from "./queue-room";
import { sameSecret, verifyToken } from "./token";

export { QueueRoom };

/**
 * Routes:
 *   POST /rpc        { room, ...QueueOp }      server only, Bearer secret
 *   POST /broadcast  { room, event, data }     server only, Bearer secret
 *   GET  /ws?token=  WebSocket for a mod panel (token from /api/realtime/token)
 *   GET  /health
 */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function room(env: Env, name: unknown) {
  if (typeof name !== "string" || !/^[\w-]{1,100}$/.test(name)) {
    throw new Error("room is required");
  }
  return env.QUEUE_ROOM.get(env.QUEUE_ROOM.idFromName(name));
}

function bearer(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/ws") {
      const token = await verifyToken(url.searchParams.get("token"), env.QUEUE_WORKER_SECRET);
      if (!token) {
        return new Response("Unauthorized", { status: 401 });
      }
      const headers = new Headers(request.headers);
      headers.set("X-Member", JSON.stringify({ id: token.sub, username: token.username, picture: token.picture }));
      return room(env, token.room).fetch(new Request(request, { headers }));
    }

    if (request.method !== "POST" || (url.pathname !== "/rpc" && url.pathname !== "/broadcast")) {
      return json({ error: "Not found" }, 404);
    }
    if (!sameSecret(bearer(request), env.QUEUE_WORKER_SECRET)) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body: { room?: unknown; event?: unknown; data?: unknown } & Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Body must be JSON" }, 400);
    }

    try {
      const stub = room(env, body.room);
      if (url.pathname === "/broadcast") {
        if (typeof body.event !== "string" || !body.event) {
          return json({ error: "event is required" }, 400);
        }
        return json({ sent: await stub.broadcast(body.event, body.data ?? {}) });
      }
      const { room: _room, ...op } = body;
      return json(await stub.apply(op as unknown as QueueOp));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json({ error: message }, 400);
    }
  },
} satisfies ExportedHandler<Env>;
