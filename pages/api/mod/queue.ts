import { getQueue, updateOrder } from "../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";

const queueApiHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = getSession(req, res);
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
          res.status(500).json({ error: "Error getting queue" });
        }
        // console.log(queue);

        const requestData = await prisma.request.findMany({
          where: {
            id: { in: queue.order.map((requestID) => parseInt(requestID)) },
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

        for (let i = 0; i < queue?.order?.length; i++) {
          const requestIndex = requestData.findIndex(
            (request) => request.id.toString() === queue?.order[i]
          );
          requests.push(requestData[requestIndex]);
        }

        const queueResponse = {
          order: requests,
          is_updating: queue.is_updating,
          being_updated_by: queue.being_updated_by,
        };
        // console.log(queueResponse);
        res.status(200).json(queueResponse);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
      }
    } else if (req.method === "POST") {
      //   // TODO: validate body
      const newQueue = req.body;
      // console.log(newQueue);
      const didUpdateQueue = await updateOrder(newQueue.updatedOrder);
      if (!didUpdateQueue) {
        res.status(500).json({ error: "Error updating order" });
      }
      return res.status(200).json({ success: true });
    } else {
      res.status(405).send(`${req.method} is not a valid`);
    }
  }
);

export default queueApiHandler;
