import { getSession } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../utils/prisma";
const Pusher = require("pusher");
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  host: process.env.PUSHER_HOST!,
  port: process.env.PUSHER_PORT!,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  useTLS: true,
});

const pusherAuth = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = getSession(req, res);
  if (!session) {
    return res.status(403).send("Not Signed In");
  }

  const isMod = await prisma.mod.findFirst({
    where: {
      twitch_id: session.user.sub.split("|")[2],
    },
  });

  if (!isMod) {
    return res.status(403).send("Not a mod");
  }

  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const presenceData = {
    user_id: `user-${session.user.sub.split("|")[2]}`,
    user_info: {
      username: session.user.preferred_username,
      picture: session.user.picture,
    },
  };
  const auth = pusher.authenticate(socketId, channel, presenceData);
  return res.send(auth);
};

export default pusherAuth;
