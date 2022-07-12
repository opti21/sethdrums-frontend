import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import {
  getQueue,
  removePrioFromProcessing,
  setPrioAsProcessing,
  updateOrderIdStrings,
} from "../../../../redis/handlers/Queue";
import prisma from "../../../../utils/prisma";

const MakeRequestPrioApiHandler = withApiAuthRequired(
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

    if (req.method === "POST") {
      if (!req.query.newStatus || !req.query.requestID) {
        res.status(422).send("missing necessary query");
      }
      try {
        const requestID = parseInt(req.query.requestID as string);
        const newStatus = req.query.newStatus === "true" ? true : false;
        const currentQueue = await getQueue();

        if (
          currentQueue.currently_processing.includes(
            req.query.requestID as string
          )
        ) {
          return res.status(409).json({
            success: false,
            message: "Request already being bumped to prio",
          });
        }

        await setPrioAsProcessing(req.query.requestID as string);

        if (newStatus === true) {
          const numOfPrio = await prisma.request.count({
            where: {
              id: {
                in: currentQueue.order.map((requestID) => parseInt(requestID)),
              },
              priority: true,
            },
          });

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
          await removePrioFromProcessing(requestID.toString());
          return res.status(200).send("Request updated");
        } else {
          const numOfPrio = await prisma.request.count({
            where: {
              OR: [
                {
                  id: {
                    in: currentQueue.order.map((requestID) =>
                      parseInt(requestID)
                    ),
                  },
                  priority: true,
                },
                {
                  id: {
                    in: currentQueue.order.map((requestID) =>
                      parseInt(requestID)
                    ),
                  },
                  mod_prio: true,
                },
              ],
            },
          });
          await prisma.request.update({
            where: {
              id: requestID,
            },
            data: {
              priority: false,
              mod_prio: false,
              raffle_prio: false,
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
          await removePrioFromProcessing(requestID.toString());
          return res.status(200).send("Request updated");
        }
      } catch (error) {
        console.error(error);
        await removePrioFromProcessing(req.query.requestID as string);
        return res.status(500).send("Error updating prio status");
      }
    } else {
      return res.status(405).send(`${req.method} is not a valid method`);
    }
  }
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
