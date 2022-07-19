import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import {
  getQueue,
  updateNowPlaying,
  updateOrderIdStrings,
} from "../../../../redis/handlers/Queue";
import prisma from "../../../../utils/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

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
      if (!req.body.requestID) {
        return res.status(422).send("missing necessary query");
      }
      try {
        const requestID = parseInt(req.body.requestID.toString());
        const queue = await getQueue();

        const updatedRequest = await prisma.request.update({
          where: {
            id: requestID,
          },
          data: {
            played: false,
            played_at: null,
            vod_link: null,
          },
        });

        const requestIDStr = requestID.toString();
        if (updatedRequest.priority) {
          queue.order.splice(0, 0, requestIDStr);

          await updateOrderIdStrings(queue.order);
          await updateNowPlaying("");

          return res.status(200).send("Request updated");
        } else {
          const numOfPrio = await prisma.request.count({
            where: {
              id: {
                in: queue.order.map((requestID) => parseInt(requestID)),
              },
              priority: true,
            },
          });
          queue.order.splice(numOfPrio, 0, requestIDStr);

          await updateOrderIdStrings(queue.order);
          await updateNowPlaying("");

          return res.status(200).send("Request updated");
        }
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError) {
          if (err.code === "P2025") {
            return res
              .status(422)
              .json({ success: false, error: "Request does not exist" });
          } else {
            console.error(err);
            return res.status(500).json({
              success: false,
              error: "Prisma error marking request played",
            });
          }
        }
        console.error(err);
        return res.status(500).json({
          success: false,
          message: "Error returning request to queue",
        });
      }
    } else {
      return res.status(405).send(`${req.method} is not a valid method`);
    }
  }
);

export default MakeRequestPrioApiHandler;
