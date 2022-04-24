import { getQueue } from "../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";

const queueApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    try {
      const queue = await getQueue();

      if (!queue) {
        res.status(500).json({ error: "Error getting queue from redis" });
      }

      const requestData = await prisma.request.findMany({
        where: {
          id: { in: queue.order.map((requestID) => parseInt(requestID)) },
        },
        include: {
          Video: true,
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
            Video: true,
          },
        });
        nowPlaying = nowPlayingRequest;
      }

      const queueResponse = {
        order: requests,
        is_updating: queue.is_updating,
        now_playing: nowPlaying,
      };
      res.status(200).json(queueResponse);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  } else {
    res.status(405).send(`${req.method} is not a valid`);
  }
};

export default queueApiHandler;
