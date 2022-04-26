import { getQueue, updateOrder } from "../../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../utils/prisma";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { withSentry } from "@sentry/nextjs";

const queueApiHandler = withSentry(
  withApiAuthRequired(async (req: NextApiRequest, res: NextApiResponse) => {
    const session = getSession(req, res);
    const isMod = await prisma.mod.findFirst({
      where: {
        twitch_id: session.user.sub.split("|")[2],
      },
    });

    if (!isMod) {
      return res.status(403).send("Not a mod");
    }

    if (req.method === "POST") {
      // TODO: validate body
      const queue = await getQueue();

      if (!queue) {
        res.status(500).json({ error: "Error getting queue" });
      }

      const requestData = await prisma.request.findMany({
        where: {
          id: { in: queue.order.map((requestID) => parseInt(requestID)) },
          priority: true,
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

      for (let i = 0; i < requestData.length; i++) {
        const requestIndex = requestData.findIndex(
          (request) => request.id.toString() === queue?.order[i]
        );
        if (requestIndex != -1) {
          requests.push(requestData[requestIndex]);
        }
      }

      const didUpdateQueue = await updateOrder(requests);
      if (!didUpdateQueue) {
        res.status(500).json({ error: "Error updating order" });
      }

      return res.status(200).json({ success: true });
    } else {
      res.status(405).send(`${req.method} is not a valid`);
    }
  })
);

export default queueApiHandler;
