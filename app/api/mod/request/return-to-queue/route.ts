import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { getQueue, setNowPlaying, setOrder } from "@/lib/server/queue";
import { toIds } from "@/lib/server/queue-view";
import { broadcast } from "@/lib/server/pusher";

export const dynamic = "force-dynamic";

// Put the now playing request back: priority to the top, others after the
// priority block.
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

  const queue = await getQueue();
  const order = queue.order.filter((item) => item !== String(id));
  const at = updated.priority
    ? 0
    : await prisma.request.count({ where: { id: { in: toIds(order) }, priority: true } });
  order.splice(at, 0, String(id));

  await setOrder(order);
  await setNowPlaying("");
  await broadcast("update-queue");
  return json({ success: true });
});
