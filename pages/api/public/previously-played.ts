import { getQueue } from "../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";

const queueApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    try {
      const playedSongs = await prisma.request.findMany({
        where: {
          played: true,
        },
        select: {
          id: true,
          requested_by: true,
          played_at: true,
          priority: true,
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
        orderBy: {
          played_at: "desc",
        },
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
