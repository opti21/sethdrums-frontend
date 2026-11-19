import { removeFromOrder } from "../../../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../utils/prisma";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const videoBanApiHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    const isMod = await prisma.mod.findFirst({
      where: {
        twitch_id: session.user.sub.split("|")[2],
      },
    });

    if (!isMod) {
      return res.status(403).send({ success: false, message: "Not a mod" });
    }

    if (req.method === "GET") {
      const bannedVideos = await prisma.video
        .findMany({
          where: {
            banned: true,
          },
        })
        .catch((err) => {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Error finding banned videos" });
        });

      return res.status(200).json(bannedVideos);
    } else if (req.method === "POST") {
      // TODO: validate body
      if (req.body.requestID) {
        const requestExists = await prisma.request.findFirst({
          where: {
            id: req.body.requestID,
          },
        });
        if (!requestExists) {
          return res
            .status(422)
            .json({ success: false, message: "request does not exist" });
        }
        await prisma.video
          .update({
            where: {
              id: req.body.videoID,
            },
            data: {
              banned: true,
              banned_time: dayjs.utc().format(),
              banned_by: session.user.preferred_username,
            },
          })
          .catch((err) => {
            console.error(err);

            return res
              .status(500)
              .json({ success: false, message: "Error banning video" });
          });

        const removedFromQueue = await removeFromOrder(
          req.body.requestID.toString()
        );
        if (!removedFromQueue) {
          return res.status(500).json({ error: "Server error" });
        }

        await prisma.request
          .delete({
            where: {
              id: req.body.requestID,
            },
          })
          .catch((err) => {
            console.error("Prisma error deleting banned video request");
            console.error(err);
            return res.status(500).json({ error: "Server error" });
          });

        return res.status(200).json({ success: true });
      } else {
        console.error("Missing query params for now playing");
        return res
          .status(400)
          .json({ success: false, message: "missing query params" });
      }
    } else if (req.method === "DELETE") {
      if (!req.body.videoID) {
        console.error("Can't unban video, missing videoID param");
        return res.status(422).send("Missing videoID param");
      }

      await prisma.video
        .update({
          where: {
            id: req.body.videoID,
          },
          data: {
            banned: false,
          },
        })
        .catch((err) => {
          console.error("Error unbanning video using prisma");
          return res.status(500).send("Error unbanning video");
        });

      return res.status(200).send("Video Unbanned");
    } else {
      return res.status(405).send(`${req.method} is not a valid`);
    }
  }
);

export default videoBanApiHandler;
