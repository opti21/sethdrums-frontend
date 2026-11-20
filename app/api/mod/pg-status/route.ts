import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { broadcast } from "@/lib/server/pusher";
import { PG_STATUSES, type PgStatus } from "@/lib/shared/types";

export const dynamic = "force-dynamic";

export const PUT = route(async (request) => {
  const user = await requireMod();
  const { pgStatusID, status, release } = await readJson<{ pgStatusID?: number; status?: string; release?: boolean }>(
    request
  );
  const id = Number(pgStatusID);
  if (!Number.isInteger(id) || !PG_STATUSES.includes(status as PgStatus)) {
    return json({ success: false, error: "pgStatusID and a valid status are required" }, 422);
  }
  const checker = user.username || user.twitchId;
  const current = await prisma.pG_Status.findUnique({ where: { id } });
  if (!current) {
    return json({ success: false, error: "PG status not found" }, 404);
  }

  if (release) {
    // Closing the checker without deciding only undoes this mod's own
    // "being checked", back to what it was before anyone opened it. If
    // another mod took it over, or someone already marked it, leave it.
    const { count } = await prisma.pG_Status.updateMany({
      where: { id, status: "BEING_CHECKED", checker },
      data: {
        status: current.previous_status || "NOT_CHECKED",
        checker: current.previous_checker ?? "",
        previous_status: null,
        previous_checker: null,
      },
    });
    if (count > 0) await broadcast("update-queue");
    return json({ success: true, released: count > 0 });
  }

  if (status === "BEING_CHECKED") {
    // Remember the status from before the first mod opened it, so closing
    // without deciding can put it back even after another mod took over.
    const firstOpen = current.status !== "BEING_CHECKED";
    await prisma.pG_Status.update({
      where: { id },
      data: {
        status,
        checker,
        ...(firstOpen ? { previous_status: current.status, previous_checker: current.checker ?? "" } : {}),
      },
    });
  } else {
    await prisma.pG_Status.update({
      where: { id },
      data: {
        status,
        checker: status === "NOT_CHECKED" ? "" : checker,
        previous_status: null,
        previous_checker: null,
      },
    });
  }
  await broadcast("update-queue");
  return json({ success: true });
});
