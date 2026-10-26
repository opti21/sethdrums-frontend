import { getQueue, updateOrder } from "../../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../utils/prisma";
import { auth0 } from "../../../../lib/auth0";


const queueApiHandler = auth0.withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await auth0.getSession(req);
    const isMod = await prisma.mod.findFirst({
      where: {
        twitch_id: session.user.sub.split("|")[2],
      },
    });

    if (!isMod) {
      return res.status(403).send("Not a mod");
    }

    if (req.method === "GET") {
      try {
        const queue = await getQueue();

        if (!queue) {
          return res.status(500).json({ error: "Error getting queue" });
        }

        const order = Array.isArray(queue.order) ? queue.order : [];

        const requestData = await prisma.request.findMany({
          where: {
            id: { in: order.map((requestID) => parseInt(requestID)) },
          },
          include: {
            Video: {
              include: {
                PG_Status: true,
              },
            },
          },
        });

        let requests = [];

        for (let i = 0; i < order.length; i++) {
          const requestIndex = requestData.findIndex(
            (request) => request.id.toString() === order[i]
          );
          if (requestIndex != -1) {
            requests.push(requestData[requestIndex]);
          }
        }

        let nowPlaying = null;

        if (queue.now_playing?.length > 0) {
          const nowPlayingRequest = await prisma.request.findFirst({
            where: {
              id: parseInt(queue.now_playing),
            },
            include: {
              Video: {
                include: {
                  PG_Status: true,
                },
              },
            },
          });
          nowPlaying = nowPlayingRequest;
        }

        const queueResponse = {
          order: requests,
          now_playing: nowPlaying,
          is_updating: queue.is_updating,
          is_paused: queue.is_paused,
          being_updated_by: queue.being_updated_by,
          is_open: queue.is_open,
          is_subOnly: queue.is_subOnly,
        };
        return res.status(200).json(queueResponse);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
    } else if (req.method === "POST") {
      // TODO: validate body
      const newQueue = req.body;
      const didUpdateQueue = await updateOrder(newQueue.updatedOrder);
      if (!didUpdateQueue) {
        return res.status(500).json({ error: "Error updating order" });
      }
      return res.status(200).json({ success: true });
    } else {
      return res.status(405).send(`${req.method} is not a valid`);
    }
  }
);

export default queueApiHandler;
