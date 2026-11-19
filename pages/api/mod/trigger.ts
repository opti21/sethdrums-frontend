import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";
import { pusher } from "../../../lib/pusher";

const pusherTriggerHandler = withApiAuthRequired(
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
      try {
        const { eventName, data } = req.body;
        pusher.trigger(process.env.NEXT_PUBLIC_PUSHER_CHANNEL, eventName, data);
        return res.status(200).json({ statusCode: 200 });
      } catch (error) {
        console.error(error);

        return res
          .status(500)
          .json({ success: false, message: "error triggering pusher" });
      }
    } else {
      res.status(405).send(`${req.method} is not a valid`);
    }
  }
);

export default pusherTriggerHandler;
