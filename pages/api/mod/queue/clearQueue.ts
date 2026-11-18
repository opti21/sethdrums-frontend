import { getQueue, updateOrder } from "../../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../utils/prisma";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";

const queueApiHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    const isMod = await prisma.mod.findFirst({
      where: {
        twitch_id: session.user.sub.split("|")[2],
      },
    });

    if (!isMod) {
      return res.status(403).send("Not a mod");
    }

    if (req.method === "POST") {
      const queue = await getQueue();

      if (!queue) {
        res.status(500).json({ error: "Error getting queue" });
      }

      // Get request data for prio requests currently in the queue
      const prioRequestData = await prisma.request.findMany({
        where: {
          OR: [
            {
              id: { in: queue.order.map((requestID) => parseInt(requestID)) },
              priority: true,
            },
            {
              id: { in: queue.order.map((requestID) => parseInt(requestID)) },
              mod_prio: true,
            },
          ],
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
      let requestsToBeDeleted = [];

      for (let i = 0; i < queue?.order.length; i++) {
        const requestIndex = prioRequestData.findIndex(
          (request) => request.id.toString() === queue?.order[i]
        );
        if (requestIndex != -1) {
          requests.push(prioRequestData[requestIndex]);
        } else {
          requestsToBeDeleted.push(queue?.order[i]);
        }
      }

      const didUpdateQueue = await updateOrder(requests);
      if (!didUpdateQueue) {
        res.status(500).json({ error: "Error updating order" });
      }

      await prisma.request
        .deleteMany({
          where: {
            played: false,
            priority: false,
            mod_prio: false,
          },
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ success: false });
        });

      return res.status(200).json({ success: true });
    } else {
      res.status(405).send(`${req.method} is not a valid`);
    }
  }
);

export default queueApiHandler;
