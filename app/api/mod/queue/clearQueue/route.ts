import { requireMod } from "@/lib/server/auth";
import { json, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { getQueue, updateQueue } from "@/lib/server/queue";
import { toIds } from "@/lib/server/queue-view";
import { broadcast } from "@/lib/server/pusher";

export const dynamic = "force-dynamic";

// Drop every unplayed request that isn't priority or mod priority.
export const POST = route(async () => {
  await requireMod();
  const queue = await getQueue();
  const keep = await prisma.request.findMany({
    where: {
      id: { in: toIds(queue.order) },
      OR: [{ priority: true }, { mod_prio: true }],
    },
    select: { id: true },
  });
  const keepIds = new Set(keep.map((row) => String(row.id)));
  const checked = new Set(queue.order);
  // Anything added while we looked up priorities wasn't checked, so it stays.
  await updateQueue((current) => ({
    order: current.order.filter((id) => keepIds.has(id) || !checked.has(id)),
  }));
  await prisma.request.deleteMany({
    where: { played: false, priority: false, mod_prio: false },
  });
  await broadcast("update-queue");
  return json({ success: true });
});
