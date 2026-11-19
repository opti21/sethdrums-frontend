import { requireMod } from "@/lib/server/auth";
import { json, readJson, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";
import { removeFromOrder } from "@/lib/server/queue";
import { broadcast } from "@/lib/server/pusher";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireMod();
  return json(await prisma.bannedUser.findMany({ orderBy: { banned_time: "desc" } }));
});

// Ban a user from suggesting and remove their unplayed requests.
export const POST = route(async (request) => {
  const mod = await requireMod();
  const body = await readJson<{ twitch_id?: string; twitch_username?: string; reason?: string | null }>(request);
  const twitchId = body.twitch_id?.trim();
  const twitchUsername = body.twitch_username?.trim();
  if (!twitchId || !twitchUsername) {
    return json({ success: false, error: "Missing twitch_id or twitch_username" }, 400);
  }
  if (await prisma.mod.findFirst({ where: { twitch_id: twitchId } })) {
    return json({ success: false, error: "Cannot ban a moderator" }, 403);
  }
  if (await prisma.bannedUser.findUnique({ where: { twitch_id: twitchId } })) {
    return json({ success: false, error: "User is already banned" }, 409);
  }

  await prisma.bannedUser.create({
    data: {
      twitch_id: twitchId,
      twitch_username: twitchUsername,
      reason: body.reason?.trim() || null,
      banned_by: mod.username,
    },
  });

  const pending = await prisma.request.findMany({
    where: { requested_by_id: twitchId, played: false },
    select: { id: true },
  });
  for (const { id } of pending) {
    await removeFromOrder(id);
  }
  await prisma.request.deleteMany({ where: { id: { in: pending.map((row) => row.id) } } });
  if (pending.length > 0) {
    await broadcast("update-queue");
  }
  return json({ success: true, removedRequests: pending.length });
});

export const DELETE = route(async (request) => {
  await requireMod();
  const { twitch_id } = await readJson<{ twitch_id?: string }>(request);
  if (!twitch_id) {
    return json({ success: false, error: "Missing twitch_id" }, 400);
  }
  await prisma.bannedUser.deleteMany({ where: { twitch_id } });
  return json({ success: true });
});
