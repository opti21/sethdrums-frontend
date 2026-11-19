import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { removeFromOrder, setNowPlaying } from "@/lib/server/queue";
import { broadcast } from "@/lib/server/pusher";
import { helix } from "@/lib/server/twitch";
import { SETH_TWITCH_ID } from "@/lib/server/auth";

dayjs.extend(duration);

export const dynamic = "force-dynamic";

// Mark a request as played and make it the now playing song.
export const POST = route(async (request) => {
  await requireMod();
  const { requestID } = await readJson<{ requestID?: string | number }>(request);
  const id = Number(requestID);
  if (!Number.isInteger(id)) {
    return json({ success: false, error: "requestID is required" }, 400);
  }
  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing) {
    return json({ success: false, error: "Request does not exist" }, 422);
  }

  await prisma.request.update({
    where: { id },
    data: { played: true, played_at: new Date() },
  });
  await setNowPlaying(id);
  await removeFromOrder(id);
  await broadcast("update-queue");

  // Best effort: a VOD link with a timestamp for the history page.
  void addVodLink(id);

  return json({ success: true });
});

// Clear now playing.
export const DELETE = route(async () => {
  await requireMod();
  await setNowPlaying("");
  await broadcast("update-queue");
  return json({ success: true });
});

async function addVodLink(requestId: number) {
  try {
    const { data } = await helix<{ data: { url: string; published_at: string }[] }>(
      `/videos?user_id=${SETH_TWITCH_ID}&first=1`
    );
    const vod = data[0];
    if (!vod) {
      return;
    }
    const offset = dayjs.duration(dayjs().diff(dayjs(vod.published_at))).format("HH[h]mm[m]ss[s]");
    await prisma.request.update({
      where: { id: requestId },
      data: { vod_link: `${vod.url}?t=${offset}` },
    });
  } catch (error) {
    console.error("[vod-link] could not add VOD link", error);
  }
}
