import "server-only";
import { prisma } from "./prisma";
import { getQueue, removeFromOrder } from "./queue";
import { broadcast } from "./pusher";
import { createQueuedRequest, findOpenRequestForVideo, requestableVideo } from "./videos";
import { RequestError } from "./videos";
import { parseYouTubeId } from "@/lib/shared/youtube";

// The Kick chat bot calls these with ?username=<kick name>&sr=<link>. They
// always answer 200 with a chat message as plain text.

function kickName(username: string) {
  return `kick-${username}`;
}

function openRequestBy(username: string) {
  return prisma.request.findFirst({ where: { requested_by: kickName(username), played: false } });
}

function videoProblem(error: unknown, username: string) {
  if (error instanceof RequestError) {
    switch (error.code) {
      case "banned":
        return `@${username} your song was not added, all songs must be PG/family friendly`;
      case "region_blocked":
        return `@${username} unfortunately this video cannot be played in the US, please try another.`;
      case "not_found":
        return `@${username} please provide a valid YouTube ID.`;
      default:
        return `@${username} Error creating video. Please try again.`;
    }
  }
  return null;
}

export async function kickSongRequest(username: string, sr: string) {
  const queue = await getQueue();
  if (!queue.is_open) {
    return `@${username} Queue is currently closed, please wait until it opens to suggest a song.`;
  }
  const youtubeId = parseYouTubeId(sr);
  if (!youtubeId) {
    return `@${username} please provide a valid YouTube ID.`;
  }
  if (await openRequestBy(username)) {
    return `@${username} You have already suggested a song. Please wait until it is played or removed from the suggestion list.`;
  }
  if (await findOpenRequestForVideo(youtubeId)) {
    return `@${username} This song has already been suggested. Please wait until it is played or removed from the suggestion list.`;
  }
  try {
    const video = await requestableVideo(youtubeId);
    await createQueuedRequest({ videoId: video.id, requestedBy: kickName(username), requestedById: "" });
  } catch (error) {
    const problem = videoProblem(error, username);
    if (problem) return problem;
    throw error;
  }
  await broadcast("queue-add");
  return `@${username} Your suggestion has been added to the list. :D`;
}

export async function kickReplace(username: string, sr: string) {
  const queue = await getQueue();
  if (!queue.is_open) {
    return `@${username} Queue is currently closed, please wait until it opens to replace a song.`;
  }
  const youtubeId = parseYouTubeId(sr);
  if (!youtubeId) {
    return `@${username} please provide a valid YouTube ID.`;
  }
  const existing = await openRequestBy(username);
  if (!existing) {
    return `@${username} I don't see a suggestion from you in the suggestion list, try doing !sr instead`;
  }
  if (await findOpenRequestForVideo(youtubeId)) {
    return `@${username} that song is already in the suggestion list, maybe try another song?`;
  }
  try {
    const video = await requestableVideo(youtubeId);
    await prisma.request.update({ where: { id: existing.id }, data: { video_id: video.id } });
  } catch (error) {
    const problem = videoProblem(error, username);
    if (problem) return problem;
    throw error;
  }
  await broadcast("request-updated");
  return `@${username} Your suggestion has been replaced. :D`;
}

export async function kickRemove(username: string) {
  const queue = await getQueue();
  if (!queue.is_open) {
    return `@${username} Queue is currently closed, please wait until it opens to replace a song.`;
  }
  const existing = await openRequestBy(username);
  if (!existing) {
    return `@${username} I don't see a suggestion from you in the suggestion list, try doing !sr instead`;
  }
  await removeFromOrder(existing.id);
  await prisma.request.delete({ where: { id: existing.id } });
  await broadcast("update-queue");
  return `@${username} Your suggestion has been removed.`;
}
