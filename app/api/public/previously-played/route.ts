import { json, route } from "@/lib/server/api";
import { prisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

// ?datesOnly=true -> ["2026-11-18", ...] (days that have played songs)
// ?date=YYYY-MM-DD&skip=0&take=50 -> { data, total }
export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;

  if (params.get("datesOnly") === "true") {
    const rows = await prisma.request.findMany({
      where: { played: true, played_at: { not: null } },
      select: { played_at: true },
    });
    const tz = params.get("tz") || "America/Chicago";
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    const days = new Set(rows.map((row) => fmt.format(row.played_at!)));
    return json([...days].sort().reverse());
  }

  const take = Math.min(Math.max(parseInt(params.get("take") ?? "50", 10) || 50, 1), 200);
  const skip = Math.max(parseInt(params.get("skip") ?? "0", 10) || 0, 0);
  const date = params.get("date");
  const where: { played: true; played_at?: { gte: Date; lt: Date } } = { played: true };
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // The client sends its own UTC offset in minutes so "that day" means the
    // viewer's day.
    const offset = parseInt(params.get("offset") ?? "0", 10) || 0;
    const start = new Date(`${date}T00:00:00Z`);
    start.setUTCMinutes(start.getUTCMinutes() + offset);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    where.played_at = { gte: start, lt: end };
  }

  const [data, total] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: { played_at: "desc" },
      take,
      skip,
      select: {
        id: true,
        requested_by: true,
        played_at: true,
        priority: true,
        vod_link: true,
        Video: {
          select: { id: true, youtube_id: true, title: true, channel: true, duration: true, thumbnail: true },
        },
      },
    }),
    prisma.request.count({ where }),
  ]);
  return json({ data, total });
});
