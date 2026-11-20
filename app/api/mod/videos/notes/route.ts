import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { broadcast } from "@/lib/server/pusher";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  await requireMod();
  const { videoID, notes } = await readJson<{ videoID?: number; notes?: string }>(request);
  const videoId = Number(videoID);
  if (!Number.isInteger(videoId) || typeof notes !== "string") {
    return json({ success: false, error: "videoID and notes are required" }, 422);
  }
  await prisma.video.update({ where: { id: videoId }, data: { notes: notes.slice(0, 5000) } });
  await broadcast("update-queue");
  return json({ success: true });
});
