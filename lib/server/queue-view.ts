import "server-only";
import { twitchLogin } from "./auth";
import { prisma } from "./prisma";
import { getQueue } from "./queue";

const publicVideo = {
  id: true,
  youtube_id: true,
  title: true,
  channel: true,
  duration: true,
  thumbnail: true,
} as const;

const modInclude = { Video: { include: { PG_Status: true } } } as const;

function inOrder<T extends { id: number }>(order: string[], rows: T[]) {
  const byId = new Map(rows.map((row) => [String(row.id), row]));
  return order.map((id) => byId.get(id)).filter((row): row is T => Boolean(row));
}

function toIds(order: string[]) {
  return order.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id));
}

type WithPg = { Video: { PG_Status: { id: number; checker: string | null } | null } };

/**
 * A preview build briefly saved Twitch user ids as PG checker names. Swap
 * any numeric checker for the Twitch login, here and in the database.
 */
async function repairCheckers(rows: WithPg[]) {
  const broken = rows.map((row) => row.Video.PG_Status).filter((pg) => pg?.checker && /^\d+$/.test(pg.checker));
  await Promise.all(
    broken.map(async (pg) => {
      const login = await twitchLogin(pg!.checker!);
      if (!login) return;
      pg!.checker = login;
      await prisma.pG_Status.updateMany({ where: { id: pg!.id, checker: { not: login } }, data: { checker: login } });
    })
  );
}

/** Everything the mod panel and Seth view need, in list order. */
export async function getModQueue() {
  const queue = await getQueue();
  const [rows, nowPlaying] = await Promise.all([
    prisma.request.findMany({ where: { id: { in: toIds(queue.order) } }, include: modInclude }),
    queue.now_playing
      ? prisma.request.findFirst({ where: { id: parseInt(queue.now_playing, 10) }, include: modInclude })
      : null,
  ]);

  await repairCheckers(nowPlaying ? [...rows, nowPlaying] : rows);

  return {
    order: inOrder(queue.order, rows),
    now_playing: nowPlaying,
    is_updating: queue.is_updating,
    is_paused: queue.is_paused,
    being_updated_by: queue.being_updated_by,
    is_open: queue.is_open,
    is_subOnly: queue.is_subOnly,
  };
}

export type ModQueue = Awaited<ReturnType<typeof getModQueue>>;
export type ModRequest = ModQueue["order"][number];

/** The public suggestion list: no mod notes or PG details. */
export async function getPublicQueue() {
  const queue = await getQueue();
  const [rows, nowPlaying, recentlyPlayed] = await Promise.all([
    prisma.request.findMany({
      where: { id: { in: toIds(queue.order) } },
      select: {
        id: true,
        played: true,
        priority: true,
        raffle_prio: true,
        requested_by: true,
        requested_by_id: true,
        Video: { select: publicVideo },
      },
    }),
    queue.now_playing
      ? prisma.request.findFirst({
          where: { id: parseInt(queue.now_playing, 10) },
          select: {
            id: true,
            played: true,
            priority: true,
            raffle_prio: true,
            requested_by: true,
            requested_by_id: true,
            Video: { select: publicVideo },
          },
        })
      : null,
    prisma.request.findMany({
      take: 5,
      where: { played: true },
      orderBy: { played_at: "desc" },
      select: {
        id: true,
        played: true,
        priority: true,
        raffle_prio: true,
        requested_by: true,
        requested_by_id: true,
        played_at: true,
        Video: { select: publicVideo },
      },
    }),
  ]);

  return {
    order: inOrder(queue.order, rows),
    now_playing: nowPlaying,
    recentlyPlayed,
    is_open: queue.is_open,
    is_paused: queue.is_paused,
    is_subOnly: queue.is_subOnly,
  };
}

export type PublicQueue = Awaited<ReturnType<typeof getPublicQueue>>;
export type PublicRequest = PublicQueue["order"][number];

export { toIds };
