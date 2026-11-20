import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { placeRequest, setNowPlaying } from "@/lib/server/queue";
import { broadcast } from "@/lib/server/pusher";

export const dynamic = "force-dynamic";

// Put the now playing request back at the top of its own group:
// priority -> top of the list, mod priority -> right after the priority
// songs, anything else -> right after every priority and mod priority song.
export const POST = route(async (request) => {
  await requireMod();
  const { requestID } = await readJson<{ requestID?: number | string }>(request);
  const id = Number(requestID);
  if (!Number.isInteger(id)) {
    return json({ success: false, error: "requestID is required" }, 422);
  }
  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing) {
    return json({ success: false, error: "Request does not exist" }, 422);
  }
  const updated = await prisma.request.update({
    where: { id },
    data: { played: false, played_at: null, vod_link: null },
  });

  await placeRequest(
    id,
    updated.priority ? "priority" : updated.mod_prio ? "mod_prio" : "none",
    "start"
  );
  await setNowPlaying("");
  await broadcast("update-queue");
  return json({ success: true });
});
