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
    // Everyone else in the list; the request itself doesn't count.
    const ids = toIds(queue.order).filter((id) => id !== requestId);
    // Plain priority goes behind other plain priorities. Mod priority goes
    // behind every kind of priority. Turning either off puts it just below
    // all priority songs. The two kinds swap in one click.
    const countWhere =
      kind === "priority" && on
        ? { id: { in: ids }, priority: true }
        : { id: { in: ids }, OR: [{ priority: true }, { mod_prio: true }] };
    const at = await prisma.request.count({ where: countWhere });

    await prisma.request.update({
      where: { id: requestId },
      data:
        kind === "priority"
          ? on
            ? { priority: true, mod_prio: false }
            : { priority: false, mod_prio: false, raffle_prio: false }
          : on
            ? { mod_prio: true, priority: false }
            : { mod_prio: false },
    });

    await moveInOrder(idStr, at);
    // Other panels refresh on this; no need to hold up the reply for it.
    void broadcast("update-queue");
    return true;
  } finally {
    await releaseProcessing(idStr);
  }
}
