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
            dateSet.add(song.played_at.toISOString().split("T")[0]);
          }
        });
        return res.status(200).json(Array.from(dateSet));
      }
      const whereClause: any = { played: true };
      if (typeof date === "string") {
        const start = new Date(`${date}T00:00:00.000Z`);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        whereClause.played_at = { gte: start, lt: end };
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
      });
      return res.status(200).json(playedSongs);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else {
    return res.status(405).send(`${req.method} is not a valid`);
  }
};

export default queueApiHandler;
