import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { removeFromOrder } from "@/lib/server/queue";
import { broadcast } from "@/lib/server/pusher";
import { createQueuedRequest, requestableVideo } from "@/lib/server/videos";
import { requestErrorMessage } from "@/lib/server/request-errors";
import { parseYouTubeId } from "@/lib/shared/youtube";

export const dynamic = "force-dynamic";

// A mod adds a suggestion on someone's behalf.
export const POST = route(async (request) => {
  await requireMod();
  const body = await readJson<{ ytLink?: string; requestedBy?: string }>(request);
  const youtubeId = parseYouTubeId(body.ytLink);
  const requestedBy = body.requestedBy?.trim();
  if (!youtubeId) {
    return json({ success: false, error: "Not a valid YouTube link" }, 400);
  }
  if (!requestedBy) {
    return json({ success: false, error: "Requested by is required" }, 400);
  }
  try {
    const video = await requestableVideo(youtubeId);
    await createQueuedRequest({ videoId: video.id, requestedBy, requestedById: "" });
  } catch (error) {
    const message = requestErrorMessage(error);
    if (message) {
      return json({ success: false, error: message }, 422);
    }
    throw error;
  }
  await broadcast("queue-add");
  return json({ success: true });
});

export const DELETE = route(async (request) => {
  await requireMod();
  const { requestID } = await readJson<{ requestID?: number | string }>(request);
  const id = Number(requestID);
  if (!Number.isInteger(id)) {
    return json({ success: false, error: "requestID is required" }, 400);
  }
  await removeFromOrder(id);
  await prisma.request.deleteMany({ where: { id } });
  await broadcast("update-queue");
  return json({ success: true });
});
