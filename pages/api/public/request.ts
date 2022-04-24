import type { NextApiRequest, NextApiResponse } from "next";
import { addToQueue, removeFromOrder } from "../../../redis/handlers/Queue";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import axios from "axios";
import { Request, Video } from "@prisma/client";
import { YTApiResponse } from "../../../utils/types";
import { parseYTDuration } from "../../../utils/utils";
import prisma from "../../../utils/prisma";
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

const requestApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    // TODO: validation
    const parsed = urlParser.parse(req.body.ytLink);
    const youtubeID = parsed?.id;

    if (!youtubeID) {
      return res
        .status(400)
        .json({ success: false, error: "not a valid youtube URL" });
    }

    const userAlreadyRequested = await prisma.request.findFirst({
      where: {
        requested_by: req.body.requestedBy,
        played: false,
      },
      include: {
        Video: true,
      },
    });

    const videoAlreadyRequested = await prisma.request.findFirst({
      where: {
        Video: {
          youtube_id: parsed?.id,
        },
        played: false,
      },
      include: {
        Video: true,
      },
    });

    if (userAlreadyRequested) {
      return res.status(401).send("User Already requested");
    }

    if (videoAlreadyRequested) {
      return res.status(402).send("Video Already requested");
    }

    // Check if video is in database
    const videoInDB = await prisma.video.findFirst({
      where: {
        youtube_id: parsed.id,
      },
    });

    if (!videoInDB) {
      // Video doesn't exist on database
      // Make new video then request
      const createdVideo = await createVideo(youtubeID);

      if (createdVideo) {
        const createdRequest = await createRequest(
          createdVideo.id,
          req.body.requestedBy
        );

        const addedToQueue = await addToQueue(createdRequest?.id.toString());

        if (!addedToQueue) {
          return res
            .status(500)
            .json({ success: false, error: "Error adding to queue" });
        }

        pusher.trigger(
          process.env.NEXT_PUBLIC_PUSHER_CHANNEL,
          "update-queue",
          {}
        );
        return res.status(200).json({ success: true });
      }
      return;
    }

    if (videoInDB.banned) {
      return res
        .status(422)
        .json({ success: false, message: "Video is banned" });
    }

    // If video is already in DB just create a request
    const createdRequest = await createRequest(
      videoInDB.id,
      req.body.requestedBy
    );

    if (!createRequest) {
      return res
        .status(500)
        .json({ success: false, error: "Error creating request" });
    }

    const addedToQueue = await addToQueue(createdRequest?.id.toString());

    if (!addedToQueue) {
      return res
        .status(500)
        .json({ success: false, error: "Error adding to queue" });
    }

    pusher.trigger(process.env.NEXT_PUBLIC_PUSHER_CHANNEL, "update-queue", {});
    return res.status(200).json({ success: true, message: "Request added" });
  } else if (req.method === "DELETE") {
    try {
      const removedRequest = await prisma.request.delete({
        where: {
          id: req.body.requestID,
        },
      });

      await removeFromOrder(req.body.requestID.toString());

      pusher.trigger(
        process.env.NEXT_PUBLIC_PUSHER_CHANNEL,
        "update-queue",
        {}
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ success: false, message: "error deleting request" });
    }
  } else {
    return res.status(405).send(`${req.method} is not a valid method`);
  }
};

export default requestApiHandler;

async function createVideo(videoID: string): Promise<Video | undefined> {
  try {
    const axiosResponse = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoID}&key=${process.env.GOOGLE_API_KEY}`
    );

    if (axiosResponse.data.items[0]) {
      const apiData: YTApiResponse = axiosResponse.data;
      const video = apiData.items[0];
      const duration = parseYTDuration(video.contentDetails.duration);

      const createdVideo = await prisma.video.create({
        data: {
          youtube_id: videoID,
          title: video.snippet.title,
          duration: duration,
          thumbnail: `https://i.ytimg.com/vi/${videoID}/mqdefault.jpg`,
          region_blocked: false,
          embed_blocked: false,
          channel: video.snippet.channelTitle,
          PG_Status: {
            create: {
              status: "NOT_CHECKED",
            },
          },
        },
      });

      return createdVideo;
    }
  } catch (e) {
    console.error(e);
  }
}

async function createRequest(
  videoID: number,
  username: string
): Promise<Request | undefined> {
  try {
    return await prisma.request.create({
      data: {
        video_id: videoID,
        requested_by: username,
      },
    });
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }
}
