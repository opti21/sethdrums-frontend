import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import {
  getQueue,
  updateOrderIdStrings,
} from "../../../../redis/handlers/Queue";
import prisma from "../../../../utils/prisma";
import { withSentry } from "@sentry/nextjs";

const MakeRequestPrioApiHandler = withSentry(
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
      if (!req.query.newStatus || !req.query.requestID) {
        res.status(422).send("missing necessary query");
      }
      try {
        const requestID = parseInt(req.query.requestID.toString());
        const newStatus = req.query.newStatus === "true" ? true : false;
        const currentQueue = await getQueue();
        const numOfPrio = await prisma.request.count({
          where: {
            id: {
              in: currentQueue.order.map((requestID) => parseInt(requestID)),
            },
            priority: true,
          },
        });

        if (newStatus === true) {
          const updatedRequest = await prisma.request.update({
            where: {
              id: requestID,
            },
            data: {
              priority: true,
            },
          });
          const oldIndex = currentQueue.order.findIndex(
            (currRequestID) => currRequestID === requestID.toString()
          );

          const updatedOrder = reorder(currentQueue.order, oldIndex, numOfPrio);

          await updateOrderIdStrings(updatedOrder);
          return res.status(200).send("Request updated");
        } else {
          const updatedRequest = await prisma.request.update({
            where: {
              id: requestID,
            },
            data: {
              priority: false,
            },
          });
          const oldIndex = currentQueue.order.findIndex(
            (currRequestID) => currRequestID === requestID.toString()
          );

          const updatedOrder = reorder(
            currentQueue.order,
            oldIndex,
            numOfPrio - 1
          );

          await updateOrderIdStrings(updatedOrder);
          return res.status(200).send("Request updated");
        }
      } catch (error) {
        console.error(error);
        return res.status(500).send("Error updating prio status");
      }
    } else {
      return res.status(405).send(`${req.method} is not a valid method`);
    }
  })
);

export default MakeRequestPrioApiHandler;

const reorder = (
  list: string[],
  startIndex: number,
  endIndex: number
): string[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};
