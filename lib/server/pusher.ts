import "server-only";
import Pusher from "pusher";
import { callQueueWorker } from "./queue";
import { realtimeBackend } from "./realtime";

const globalForPusher = globalThis as unknown as { pusher?: Pusher };

export const pusher =
  globalForPusher.pusher ??
  new Pusher({
    appId: process.env.PUSHER_APP_ID ?? "",
    key: process.env.PUSHER_KEY ?? "",
    secret: process.env.PUSHER_SECRET ?? "",
    cluster: process.env.PUSHER_CLUSTER ?? "",
    useTLS: true,
    timeout: 5_000,
  });
globalForPusher.pusher = pusher;

export const QUEUE_CHANNEL = process.env.NEXT_PUBLIC_PUSHER_CHANNEL ?? "";

/**
 * Tell every open panel to refetch. Never fails the request it rides on.
 * Goes over Pusher or the queue Worker's sockets (REALTIME_BACKEND).
 */
export async function broadcast(event: string, data: unknown = {}) {
  try {
    if (realtimeBackend() === "do") {
      await callQueueWorker("/broadcast", { event, data });
    } else {
      await pusher.trigger(QUEUE_CHANNEL, event, data);
    }
  } catch (error) {
    console.error(`[pusher] failed to send ${event}`, error);
  }
}
