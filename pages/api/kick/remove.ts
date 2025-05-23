import type { NextApiRequest, NextApiResponse } from "next";
import { getQueue, removeFromOrder } from "../../../redis/handlers/Queue";
import "js-video-url-parser/lib/provider/youtube";
import prisma from "../../../utils/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Pusher from "pusher";
import { pusher } from "../../../lib/pusher";
dayjs.extend(utc);

function isValidYouTubeId(id) {
  const regex = /^[a-zA-Z0-9_-]{11}$/;
  return regex.test(id);
}

const requestApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log(`${req.method} request to /api/kick/remove`);
  console.log(req.query);

  const queue = await getQueue();

  const { username } = req.query;

  if (!queue.is_open) {
    return res
      .status(200)
      .send(
        `@${username} Queue is currently closed, please wait until it opens to replace a song.`
      );
  }

  const userHasRequest = await prisma.request.findFirst({
    where: {
      requested_by: ("kick-" + username) as string,
      played: false,
    },
    include: {
      Video: true,
    },
  });

  if (!userHasRequest) {
    return res
      .status(200)
      .send(
        `@${username} I don't see a suggestion from you in the suggestion list, try doing !sr instead`
      );
  }

  try {
    await prisma.request.delete({
      where: {
        id: userHasRequest.id,
      },
    });

    await removeFromOrder(userHasRequest.id.toString());

    pusher.trigger(process.env.NEXT_PUBLIC_PUSHER_CHANNEL, "update-queue", {});

    return res
      .status(200)
      .send(`@${username} Your suggestion has been removed.`);
  } catch (err) {
    console.error(err);
    return res
      .status(200)
      .send(`@${username} There was an error removing your suggestion.`);
  }
};

export default requestApiHandler;
