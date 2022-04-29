import {
  getQueue,
  removeFromOrder,
  updateNowPlaying,
  updateOrder,
} from "../../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../utils/prisma";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { withSentry } from "@sentry/nextjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
dayjs.extend(utc);

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
      if (req.body.requestID) {
        try {
          await prisma.request.update({
            where: {
              id: parseInt(req.body.requestID),
            },
            data: {
              played: true,
              played_at: dayjs.utc().format(),
            },
          });
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
        }

        const nowPlayingUpdate = await updateNowPlaying(req.body.requestID);
        if (!nowPlayingUpdate) {
          return res.status(500).json({ error: "Server error" });
        }
        const removedFromQueue = await removeFromOrder(
          req.body.requestID.toString()
        );
        if (!removedFromQueue) {
          return res.status(500).json({ error: "Server error" });
        }

        return res.status(200).json({ success: true });
      } else {
        console.error("Missing query params for now playing");
        return res
          .status(400)
          .json({ success: false, message: "missing query params" });
      }
    } else if (req.method === "DELETE") {
      const nowPlayingUpdate = await updateNowPlaying("");
      if (!nowPlayingUpdate) {
        res.status(500).json({ error: "Server error" });
      }
      return res.status(200).json({ success: true });
    } else {
      return res.status(405).send(`${req.method} is not a valid`);
    }
  })
);

export default queueApiHandler;
