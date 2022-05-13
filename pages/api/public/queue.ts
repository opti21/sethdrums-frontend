import { getQueue } from "../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";

const queueApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    try {
      const queue = await getQueue();

      if (!queue) {
        return res
          .status(500)
          .json({ error: "Error getting queue from redis" });
      }

      const requestData = await prisma.request.findMany({
        where: {
          id: { in: queue.order.map((requestID) => parseInt(requestID)) },
        },
        select: {
          id: true,
          played: true,
          priority: true,
          requested_by: true,
          requested_by_id: true,
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
      });

      const recentlyPlayed = await prisma.request.findMany({
        take: 5,
        where: {
          played: true,
        },
        orderBy: {
          played_at: "desc",
        },
        include: {
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
      });

      let requests = [];

      for (let i = 0; i < queue?.order?.length; i++) {
        const requestIndex = requestData.findIndex(
          (request) => request.id.toString() === queue?.order[i]
        );
        if (requestIndex != -1) {
          requests.push(requestData[requestIndex]);
        }
      }

      let nowPlaying = null;

      if (queue.now_playing.length > 0) {
        const nowPlayingRequest = await prisma.request.findFirst({
          where: {
            id: parseInt(queue.now_playing),
          },
          include: {
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
        });
        nowPlaying = nowPlayingRequest;
      }

      const queueResponse = {
        order: requests,
        is_updating: queue.is_updating,
        now_playing: nowPlaying,
        recentlyPlayed,
        is_open: queue.is_open,
      };
      return res.status(200).json(queueResponse);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else {
    return res.status(405).send(`${req.method} is not a valid`);
  }
};

export default queueApiHandler;
