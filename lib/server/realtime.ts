import "server-only";
import { createHmac } from "node:crypto";
import { queueId } from "./queue";

/**
 * Which live-update service the panels use, picked by REALTIME_BACKEND:
 * "pusher" (default) or "do" (WebSockets from the queue Durable Object).
 * The panel asks /api/realtime/token at load, so switching needs no rebuild.
 */
export function realtimeBackend(): "pusher" | "do" {
  return process.env.REALTIME_BACKEND === "do" ? "do" : "pusher";
}

const TOKEN_TTL_SECONDS = 60;

/**
 * A short-lived token that lets one mod's panel open a socket to the queue
 * Worker, which checks it with the same QUEUE_WORKER_SECRET
 * (queue-worker/src/token.ts). Only needed to connect; an open socket stays
 * open after it expires.
 */
export function panelSocketUrl(user: { twitchId: string; username: string; picture?: string }) {
  const base = process.env.QUEUE_WORKER_URL;
  const secret = process.env.QUEUE_WORKER_SECRET;
  if (!base || !secret) {
    throw new Error("QUEUE_WORKER_URL and QUEUE_WORKER_SECRET must be set");
  }
  const payload = {
    sub: `user-${user.twitchId}`,
    username: user.username,
    picture: user.picture,
    room: queueId(),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  const url = new URL("/ws", base);
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
  url.searchParams.set("token", `${body}.${signature}`);
  return url.toString();
}
