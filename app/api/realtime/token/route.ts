import { requireMod } from "@/lib/server/auth";
import { json, route } from "@/lib/server/api";
import { panelSocketUrl, realtimeBackend } from "@/lib/server/realtime";

export const dynamic = "force-dynamic";

// The mod panel asks here which live-update service to use, and for the
// queue Worker gets a socket URL with a 60 second token in it.
export const GET = route(async () => {
  const user = await requireMod();
  if (realtimeBackend() !== "do") {
    return json({ backend: "pusher" });
  }
  return json({ backend: "do", url: panelSocketUrl(user) });
});
