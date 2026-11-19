import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { broadcast } from "@/lib/server/pusher";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["lock-queue", "unlock-queue", "update-queue"]);

// Panels use this to tell other mods a drag is in progress.
export const POST = route(async (request) => {
  const user = await requireMod();
  const { eventName } = await readJson<{ eventName?: string }>(request);
  if (!eventName || !ALLOWED.has(eventName)) {
    return json({ success: false, error: "Unknown event" }, 422);
  }
  await broadcast(eventName, {
    beingUpdatedBy: eventName === "lock-queue" ? user.username : "",
  });
  return json({ success: true });
});
