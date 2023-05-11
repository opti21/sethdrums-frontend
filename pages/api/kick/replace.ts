import type { NextApiRequest, NextApiResponse } from "next";
import { getQueue } from "../../../redis/handlers/Queue";
import "js-video-url-parser/lib/provider/youtube";
import { createVideo } from "../../../utils/utils";
import prisma from "../../../utils/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Pusher from "pusher";
dayjs.extend(utc);

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

function isValidYouTubeId(id) {
  const regex = /^[a-zA-Z0-9_-]{11}$/;
  return regex.test(id);
}

const requestApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
      console.log(`${req.method} request to /api/kick/replace`)
      console.log(req.query)

      const { username, sr } = req.query;

      const queue = await getQueue();

      if (!queue.is_open) {
        return res
          .status(200)
          .send(`@${username} Queue is currently closed, please wait until it opens to replace a song.`)
      }

      const isValidYTId = isValidYouTubeId(sr as string);

      if (!isValidYTId) {
        return res
          .status(200)
          .send(`@${username} please provide a valid YouTube ID.`);
      }

      const youtubeID = sr as string;

      const userHasRequest = await prisma.request.findFirst({
        where: {
          requested_by: "kick-" + username as string,
          played: false,
        },
        include: {
          Video: true,
        },
      });

      if (!userHasRequest) {
        return res
          .status(200)
          .send(`${username} I don't see a request from you in the queue, try doing !sr instead`);
      }

      const videoAlreadyRequested = await prisma.request.findFirst({
        where: {
          Video: {
            youtube_id: youtubeID,
          },
          played: false,
        },
        include: {
          Video: true,
        },
      });

      if (videoAlreadyRequested) {
        return res
          .status(200)
          .send(`@${username} that song is already in the queue, maybe try another song?`);
      }

      // Check if video is in database
      const videoInDB = await prisma.video.findUnique({
        where: {
          youtube_id: youtubeID,
        },
      });

      if (!videoInDB) {
        // Video doesn't exist on database
        // Make new video then request
        const createdVideo = await createVideo(youtubeID).catch((error) => {
          console.error(error);
          return res
            .status(200)
            .send(`@${username} Error creating your request. Please try again.`)
        });

        if (!createdVideo) {
          return res
            .status(200)
            .send(`@${username} Error creating video. Please try again.`)
        }

        if (createdVideo.region_blocked) {
          return res.status(200)
          .send(`@${username} Video must be playable in the US, please try another video.`);
        }

        const requestUpdated = await updateRequest(
          userHasRequest.id,
          createdVideo.id,
        );
    
        if (!requestUpdated) {
          return res
            .status(200)
            .send(`@${username} Error replacing your request. Please try again.`)
        }
    
        pusher.trigger(
          process.env.NEXT_PUBLIC_PUSHER_CHANNEL,
          "update-queue",
          {}
        );
        return res.status(200).send(`@${username} Your request has been replaced. :D`);

      }

      if (videoInDB.banned) {
        return res
          .status(200)
          .send(`${username} Unfortunately this video cannot be requested, please try another.`);
      }

      if (videoInDB.region_blocked) {
        return res.status(200)
          .send(`${username} Video must be playable in the US, please try another video.`);
      }

      // If video is already in DB just create a request
      const requestUpdated = await updateRequest(
        userHasRequest.id,
        videoInDB.id,
      );
    
      if (!requestUpdated) {
        return res
          .status(200)
          .send(`@${username} Error replacing your request. Please try again.`)
      }

      pusher.trigger(
        process.env.NEXT_PUBLIC_PUSHER_CHANNEL,
        "update-queue",
        {}
      );

      res.status(200).send(`@${username} Your request has been replaced. :D`);
};

export default requestApiHandler;

async function updateRequest(
  requestID: number,
  videoID: number
): Promise<boolean> {
  try {
    await prisma.request.update({
      where: {
        id: requestID,
      },
      data: {
        video_id: videoID,
      },
    });

    return true;
  } catch (e) {
    console.error("Error updating request: ", e);
    return false;
  }
}
