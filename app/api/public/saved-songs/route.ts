import { requireUser } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

// Songs the viewer saved with !save in chat.
export const GET = route(async () => {
  const user = await requireUser();
  const saved = await prisma.savedSongs.findUnique({
    where: { twitch_id: user.twitchId },
    select: { saved_videos: { select: { id: true, youtube_id: true, title: true, thumbnail: true } } },
  });
  return json(saved?.saved_videos ?? []);
});

export const DELETE = route(async (request) => {
  const user = await requireUser();
  const { video_id } = await readJson<{ video_id?: number }>(request);
  const videoId = Number(video_id);
  if (!Number.isInteger(videoId) || videoId <= 0) {
    return json({ success: false, error: "video_id is required" }, 400);
  }
  await prisma.savedSongs.update({
    where: { twitch_id: user.twitchId },
    data: { saved_videos: { disconnect: [{ id: videoId }] } },
  });
  return json({ success: true });
});
