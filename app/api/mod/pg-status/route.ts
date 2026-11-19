import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { broadcast } from "@/lib/server/pusher";
import { PG_STATUSES, type PgStatus } from "@/lib/shared/types";

export const dynamic = "force-dynamic";

export const PUT = route(async (request) => {
  const user = await requireMod();
  const { pgStatusID, status } = await readJson<{ pgStatusID?: number; status?: string }>(request);
  const id = Number(pgStatusID);
  if (!Number.isInteger(id) || !PG_STATUSES.includes(status as PgStatus)) {
    return json({ success: false, error: "pgStatusID and a valid status are required" }, 422);
  }
  await prisma.pG_Status.update({
    where: { id },
    data: { status, checker: status === "NOT_CHECKED" ? "" : user.username },
  });
  await broadcast("update-queue");
  return json({ success: true });
});
