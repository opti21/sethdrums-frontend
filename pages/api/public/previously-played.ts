import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";

const queueApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    try {
      const { date, datesOnly } = req.query;
      if (datesOnly === "true") {
        const songs = await prisma.request.findMany({
          where: { played: true },
          select: { played_at: true },
        });
        const dateSet = new Set<string>();
        songs.forEach((song) => {
          if (song.played_at) {
            const localDate = song.played_at.toLocaleDateString("en-CA");
            dateSet.add(localDate);
          }
        });
        return res.status(200).json(Array.from(dateSet));
      }
      const whereClause: any = { played: true };
      let take = req.query.take ? parseInt(req.query.take as string, 10) : 50;
      let skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;

      if (typeof date === "string") {
        const start = new Date(`${date}T00:00:00`);
        const end = new Date(`${date}T23:59:59.999`);
        whereClause.played_at = { gte: start, lte: end };
      }

      const playedSongs = await prisma.request.findMany({
        where: whereClause,
        select: {
          id: true,
          requested_by: true,
          played_at: true,
          priority: true,
          vod_link: true,
          Video: {
            select: {
              id: true,
              youtube_id: true,
              title: true,
              channel: true,
              duration: true,
              thumbnail: true,
            },
          },
        },
        orderBy: { played_at: "desc" },
        ...(take ? { take } : {}),
        ...(skip ? { skip } : {}),
      });
      const total = await prisma.request.count({ where: whereClause });
      return res.status(200).json({ data: playedSongs, total });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else {
    return res.status(405).send(`${req.method} is not a valid`);
  }
};

export default queueApiHandler;
