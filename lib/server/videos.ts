import "server-only";
import { prisma } from "./prisma";
import { addToQueue } from "./queue";

const YT_TIMEOUT_MS = 8_000;

/** ISO 8601 duration from the YouTube API ("PT4M5S") to seconds. */
export function parseYTDuration(duration: string): number {
  const match = duration.match(/P(\d+Y)?(\d+W)?(\d+D)?T?(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) {
    return 0;
  }
  const [years, weeks, days, hours, minutes, seconds] = match
    .slice(1)
    .map((part) => (part ? parseInt(part, 10) : 0));
  return (((years * 365 + weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60 + seconds;
}

type YouTubeVideo = {
  snippet: { title: string; channelTitle: string };
  contentDetails: {
    duration: string;
    regionRestriction?: { allowed?: string[]; blocked?: string[] };
  };
};

function isBlockedInUS(video: YouTubeVideo) {
  const restriction = video.contentDetails.regionRestriction;
  if (!restriction) {
    return false;
  }
  if (restriction.allowed && !restriction.allowed.includes("US")) {
    return true;
  }
  return Boolean(restriction.blocked?.includes("US"));
}

export class RequestError extends Error {
  constructor(public code: RequestErrorCode) {
    super(code);
  }
}

export type RequestErrorCode =
  | "not_found"
  | "region_blocked"
  | "banned"
  | "youtube_error";

/** Find the video in the database, or look it up on YouTube and save it. */
export async function findOrCreateVideo(youtubeId: string) {
  const existing = await prisma.video.findUnique({ where: { youtube_id: youtubeId } });
  if (existing) {
    return existing;
  }

  const url = new URL("https://youtube.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", youtubeId);
  url.searchParams.set("key", process.env.GOOGLE_API_KEY ?? "");

  const res = await fetch(url, { signal: AbortSignal.timeout(YT_TIMEOUT_MS) });
  if (!res.ok) {
    console.error("[youtube] lookup failed", res.status, await res.text());
    throw new RequestError("youtube_error");
  }
  const data = (await res.json()) as { items?: YouTubeVideo[] };
  const video = data.items?.[0];
  if (!video) {
    throw new RequestError("not_found");
  }

  return prisma.video.create({
    data: {
      youtube_id: youtubeId,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      duration: parseYTDuration(video.contentDetails.duration),
      thumbnail: `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
      region_blocked: isBlockedInUS(video),
      embed_blocked: false,
      PG_Status: { create: { status: "NOT_CHECKED" } },
    },
  });
}

/** Find or create the video and check that it may be requested. */
export async function requestableVideo(youtubeId: string) {
  const video = await findOrCreateVideo(youtubeId);
  if (video.banned) {
    throw new RequestError("banned");
  }
  if (video.region_blocked) {
    throw new RequestError("region_blocked");
  }
  return video;
}

/** Create a request for a video and append it to the suggestion list. */
export async function createQueuedRequest(input: {
  videoId: number;
  requestedBy: string;
  requestedById: string;
}) {
  const request = await prisma.request.create({
    data: {
      video_id: input.videoId,
      requested_by: input.requestedBy,
      requested_by_id: input.requestedById,
    },
  });
  try {
    await addToQueue(request.id);
  } catch (error) {
    // Don't leave a request in the database that no list points at.
    await prisma.request.delete({ where: { id: request.id } }).catch(() => {});
    throw error;
  }
  return request;
}

/** The unplayed request for this YouTube video, if any. */
export function findOpenRequestForVideo(youtubeId: string) {
  return prisma.request.findFirst({
    where: { played: false, Video: { youtube_id: youtubeId } },
  });
}
