import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { removeFromOrder } from "@/lib/server/queue";
import { broadcast } from "@/lib/server/pusher";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireMod();
  return json(
    await prisma.video.findMany({ where: { banned: true }, orderBy: { banned_time: "desc" } })
  );
});

// Ban the video of a request and remove that request from the list.
export const POST = route(async (request) => {
  const mod = await requireMod();
  const { requestID, videoID } = await readJson<{ requestID?: number; videoID?: number }>(request);
  const requestId = Number(requestID);
  const videoId = Number(videoID);
  if (!Number.isInteger(requestId) || !Number.isInteger(videoId)) {
    return json({ success: false, error: "requestID and videoID are required" }, 400);
  }
  await prisma.video.update({
    where: { id: videoId },
    data: { banned: true, banned_time: new Date(), banned_by: mod.username },
  });
  await prisma.pG_Status.updateMany({
    where: { video_id: videoId },
    data: { status: "NON_PG", checker: mod.username },
  });
  await removeFromOrder(requestId);
  await prisma.request.deleteMany({ where: { id: requestId, played: false } });
  await broadcast("update-queue");
  return json({ success: true });
});

export const DELETE = route(async (request) => {
  await requireMod();
  const { videoID } = await readJson<{ videoID?: number }>(request);
  const videoId = Number(videoID);
  if (!Number.isInteger(videoId)) {
    return json({ success: false, error: "videoID is required" }, 422);
  }
  await prisma.video.update({ where: { id: videoId }, data: { banned: false } });
  return json({ success: true });
});
