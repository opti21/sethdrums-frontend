import type { NextApiRequest, NextApiResponse } from "next";
import {
  addToQueue,
  getQueue,
  removeFromOrder,
} from "../../../redis/handlers/Queue";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import axios from "axios";
import { Request, Video } from "@prisma/client";
import { YTApiResponse } from "../../../utils/types";
import { parseYTDuration } from "../../../utils/utils";
import prisma from "../../../utils/prisma";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { pusher } from "../../../lib/pusher";

const publicRequestApiHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = getSession(req, res);
    if (process.env.NODE_ENV === "development") {
      if (session.user.sub.split("|")[0] === "auth0") {
        session.user.sub = "auth0|test_user|test_user_id";
        session.user.preferred_username = "test_user";
      }
    }

    if (req.method === "POST") {
      const queue = await getQueue();

      if (!queue.is_open) {
        return res
          .status(406)
          .json({
            success: false,
            error: "Suggestion List is currently closed",
          });
      }

      if (queue.is_paused) {
        return res
          .status(406)
          .json({
            success: false,
            error: "Suggestion List is currently paused",
          });
      }

      const parsed = urlParser.parse(req.body.ytLink);
      const youtubeID = parsed?.id;

      if (!parsed) {
        return res
          .status(406)
          .json({ success: false, error: "not a valid youtube URL" });
      }

      const userAlreadyRequested = await prisma.request.findFirst({
        where: {
          requested_by_id: session.user.sub.split("|")[2],
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
        return res
          .status(406)
          .send({ success: false, error: "User Already requested" });
      }

      if (videoAlreadyRequested) {
        return res
          .status(406)
          .send({ success: false, error: "Video Already requested" });
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
        const createdVideo = await createVideo(youtubeID).catch((error) => {
          console.error(error);
          return res
            .status(500)
            .json({ success: false, error: "Error creating video" });
        });

        if (createdVideo) {
          if (createdVideo.region_blocked) {
            return res.status(400).json({
              success: false,
              error: "Video must be playable in the US",
            });
          }

          const createdRequest = await createRequest(
            createdVideo.id,
            session.user.preferred_username,
            session.user.sub.split("|")[2]
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
        return res.status(406).json({
          success: false,
          error: "Requests must be PG13, please request another.",
        });
      }

      if (videoInDB.region_blocked) {
        return res.status(400).json({
          success: false,
          error: "Video must be playable in the US",
        });
      }

      // If video is already in DB just create a request
      const createdRequest = await createRequest(
        videoInDB.id,
        session.user.preferred_username,
        session.user.sub.split("|")[2]
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

      pusher.trigger(
        process.env.NEXT_PUBLIC_PUSHER_CHANNEL,
        "update-queue",
        {}
      );
      return res.status(200).json({ success: true, message: "Request added" });
    } else if (req.method === "DELETE") {
      try {
        const request = await prisma.request.findFirst({
          where: {
            id: req.body.requestID,
          },
        });

        if (!request) {
          return res
            .status(406)
            .json({ success: false, error: "Request does not exsist" });
        }

        if (request.requested_by_id != session.user.sub.split("|")[2]) {
          console.error(
            "someone is trying to delete a request that's not there's"
          );
          return res.status(406).json({
            success: false,
            error: "Hey you shouldn't be doing that, it's not yours",
          });
        }
        await prisma.request.delete({
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
          .json({ success: false, error: "error deleting request" });
      }
    } else {
      return res
        .status(405)
        .json({ success: false, error: `${req.method} is not a valid method` });
    }
  }
);

export default publicRequestApiHandler;

async function createVideo(videoID: string): Promise<Video | undefined> {
  try {
    const axiosResponse = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoID}&key=${process.env.GOOGLE_API_KEY}`
    );

    if (axiosResponse.data.items[0]) {
      const apiData: YTApiResponse = axiosResponse.data;
      const video = apiData.items[0];
      const duration = parseYTDuration(video.contentDetails.duration);
      let regionBlocked = false;

      // Check if video is blocked from US
      if (video.contentDetails.regionRestriction) {
        if (!video.contentDetails.regionRestriction.allowed.includes("US")) {
          regionBlocked = true;
        }
      }

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
    return Promise.reject(e);
  }
}

async function createRequest(
  videoID: number,
  username: string,
  userID: string
): Promise<Request | undefined> {
  try {
    return await prisma.request.create({
      data: {
        video_id: videoID,
        requested_by: username,
        requested_by_id: userID,
      },
    });
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }
}
