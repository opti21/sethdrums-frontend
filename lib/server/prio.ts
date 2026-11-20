import "server-only";
import { prisma } from "./prisma";
import { claimProcessing, placeRequest, releaseProcessing } from "./queue";
import { broadcast } from "./pusher";

export type PrioKind = "priority" | "mod_prio";

/**
 * Turn priority or mod priority on or off and move the request to the end of
 * its new group: behind the other plain priorities, behind every priority
 * song for mod priority, or just below all priority songs when turned off.
 * Returns false when another mod is already moving this request.
 */
export async function setPrio(requestId: number, kind: PrioKind, on: boolean) {
  const idStr = String(requestId);
  if (!(await claimProcessing(idStr))) {
    return false;
  }
  try {
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

    if (on) {
      await placeRequest(idStr, kind, "end");
    } else {
      await placeRequest(idStr, "none", "start");
    }
    // Other panels refresh on this; no need to hold up the reply for it.
    void broadcast("update-queue");
    return true;
  } finally {
    await releaseProcessing(idStr);
  }
}
