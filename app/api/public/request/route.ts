import { requireUser } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { getQueue, removeFromOrder } from "@/lib/server/queue";
import { broadcast } from "@/lib/server/pusher";
import { createQueuedRequest, findOpenRequestForVideo, requestableVideo } from "@/lib/server/videos";
import { requestErrorMessage } from "@/lib/server/request-errors";
import { parseYouTubeId } from "@/lib/shared/youtube";

export const dynamic = "force-dynamic";

const refuse = (error: string, status = 406) => json({ success: false, error }, status);

// A signed-in viewer suggests a song.
export const POST = route(async (request) => {
  const user = await requireUser();
  const queue = await getQueue();
  if (!queue.is_open) {
    return refuse("Suggestion List is currently closed");
  }
  if (queue.is_paused) {
    return refuse("Suggestion List is currently paused");
  }
  if (queue.is_subOnly) {
    return refuse("Suggestion List is open to subs only, please suggest in chat");
  }
  if (await prisma.bannedUser.findUnique({ where: { twitch_id: user.twitchId } })) {
    return refuse("You are banned from making song requests", 403);
  }

  const { ytLink } = await readJson<{ ytLink?: string }>(request);
  const youtubeId = parseYouTubeId(ytLink);
  if (!youtubeId) {
    return refuse("Not a valid YouTube link");
  }
  if (await prisma.request.findFirst({ where: { requested_by_id: user.twitchId, played: false } })) {
    return refuse("You already have a suggestion in the list");
  }
  if (await findOpenRequestForVideo(youtubeId)) {
    return refuse("That song is already in the list");
  }

  try {
    const video = await requestableVideo(youtubeId);
    await createQueuedRequest({
      videoId: video.id,
      requestedBy: user.username,
      requestedById: user.twitchId,
    });
  } catch (error) {
    const message = requestErrorMessage(error);
    if (message) {
      return refuse(message);
    }
    throw error;
  }
  await broadcast("queue-add");
  return json({ success: true });
});

// A viewer removes their own suggestion.
export const DELETE = route(async (request) => {
  const user = await requireUser();
  const { requestID } = await readJson<{ requestID?: number }>(request);
  const id = Number(requestID);
  const existing = Number.isInteger(id) ? await prisma.request.findUnique({ where: { id } }) : null;
  if (!existing || existing.played) {
    return refuse("Request does not exist");
  }
  if (existing.requested_by_id !== user.twitchId) {
    return refuse("You can only remove your own suggestion", 403);
  }
  await removeFromOrder(id);
  await prisma.request.delete({ where: { id } });
  await broadcast("update-queue");
  return json({ success: true });
});
