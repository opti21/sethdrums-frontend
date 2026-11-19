import "server-only";
import Pusher from "pusher";

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

/** Tell every open panel to refetch. Never fails the request it rides on. */
export async function broadcast(event: string, data: unknown = {}) {
  try {
    await pusher.trigger(QUEUE_CHANNEL, event, data);
  } catch (error) {
    console.error(`[pusher] failed to send ${event}`, error);
  }
}
