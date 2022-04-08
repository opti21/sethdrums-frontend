import { read } from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import Pusher from "pusher";

if (
  !process.env.PUSHER_APP_ID ||
  !process.env.PUSHER_KEY ||
  !process.env.PUSHER_SECRET ||
  !process.env.PUSHER_CLUSTER
) {
  throw new Error("Missing Pusher environment variables");
}

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

const pusherTriggerHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method === "POST") {
    try {
      const { channelName, eventName, data } = req.body;
      console.log(channelName);
      console.log(eventName);
      console.log(data);
      pusher.trigger(channelName, eventName, data);
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
};

export default pusherTriggerHandler;
