import "server-only";
import { prisma } from "./prisma";
import { claimProcessing, getQueue, moveInOrder, releaseProcessing } from "./queue";
import { toIds } from "./queue-view";
import { broadcast } from "./pusher";

export type PrioKind = "priority" | "mod_prio";

/**
 * Turn priority or mod priority on or off and move the request to the end of
 * the priority block (on) or just below it (off). Returns false when another
 * mod is already moving this request.
 */
export async function setPrio(requestId: number, kind: PrioKind, on: boolean) {
  const idStr = String(requestId);
  if (!(await claimProcessing(idStr))) {
    return false;
  }
  try {
    const queue = await getQueue();
    const ids = toIds(queue.order);
    // Plain priority goes behind other plain priorities; mod priority goes
    // behind every kind of priority.
    const countWhere =
      kind === "priority" && on
        ? { id: { in: ids }, priority: true }
        : { id: { in: ids }, OR: [{ priority: true }, { mod_prio: true }] };
    const prioCount = await prisma.request.count({ where: countWhere });

    await prisma.request.update({
      where: { id: requestId },
      data:
        kind === "priority"
          ? on
            ? { priority: true }
            : { priority: false, mod_prio: false, raffle_prio: false }
          : { mod_prio: on },
    });

    await moveInOrder(idStr, on ? prioCount : prioCount - 1);
    await broadcast("update-queue");
    return true;
  } finally {
    await releaseProcessing(idStr);
  }
}
