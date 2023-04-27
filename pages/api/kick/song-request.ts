import type { NextApiRequest, NextApiResponse } from "next";
import { addToQueue, removeFromOrder } from "../../../redis/handlers/Queue";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import axios from "axios";
import { Request, Video } from "@prisma/client";
import { YTApiResponse } from "../../../utils/types";
import { parseYTDuration } from "../../../utils/utils";
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

const requestApiHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
      console.log(`${req.method} request to /api/kick/song-request`)
      console.log(req.query)

        const {username, sr} = req.query;

      const parsed = urlParser.parse(sr as string);
      const youtubeID = parsed?.id;

      if (!youtubeID) {
        return res
          .status(200)
          .send("Please use a valid youtube URL");
      }

      const userAlreadyRequested = await prisma.request.findFirst({
        where: {
          requested_by: "kick-" + username as string,
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
          .status(200)
          .send("You have already requested a song. Please wait until it is played or removed from the queue.");
      }

      if (videoAlreadyRequested) {
        return res
          .status(200)
          .send("This song has already been requested. Please wait until it is played or removed from the queue.");
      }

      // Check if video is in database
      const videoInDB = await prisma.video.findUnique({
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
            .status(200)
            .send("Error creating your request. Please try again.")
        });

        if (createdVideo) {
          if (createdVideo.region_blocked) {
            return res.status(200)
            .send("Error: Video must be playable in the US");
          }
          const createdRequest = await createRequest(
            createdVideo.id,
            "kick-" + username as string,
            ""
          );

          const addedToQueue = await addToQueue(createdRequest?.id.toString());

          if (!addedToQueue) {
            return res
              .status(200)
              .send("Error adding to queue");
          }

          pusher.trigger(
            process.env.NEXT_PUBLIC_PUSHER_CHANNEL,
            "update-queue",
            {}
          );
          return res.status(200).send("Your request has been added to the queue. :)");
        }
        return;
      }

      if (videoInDB.banned) {
        return res
          .status(200)
          .send("Unfortunately this video cannot be requested, please try another.");
      }

      if (videoInDB.region_blocked) {
        return res.status(200)
            .send("Error: Video must be playable in the US");
      }

      // If video is already in DB just create a request
      const createdRequest = await createRequest(
        videoInDB.id,
        "kick-" + username as string,
        ""
      );

      if (!createRequest) {
        return res
          .status(200)
          .send("Error creating your request. Please try again.")
      }

      const addedToQueue = await addToQueue(createdRequest?.id.toString());

      if (!addedToQueue) {
        return res
          .status(200)
          .send("Error creating your request. Please try again.")
      }

      pusher.trigger(
        process.env.NEXT_PUBLIC_PUSHER_CHANNEL,
        "update-queue",
        {}
      );

      res.status(200).send("Your request has been added to the queue. :D");
    // else if (req.method === "PUT") {
    //   if (!req.body.requestID) {
    //     console.error("Missing requestID in body");
    //     return res.status(422).send("Body missing reuquestID");
    //   }
    //   try {
    //     await prisma.request.update({
    //       where: {
    //         id: parseInt(req.body.requestID),
    //       },
    //       data: {
    //         played: req.body.played,
    //         played_at: dayjs.utc().format(),
    //       },
    //     });
    //     return res
    //       .status(200)
    //       .json({ success: true, message: "Request updated" });
    //   } catch (error) {
    //     console.error(error);
    //     return res
    //       .status(500)
    //       .json({ success: false, message: "error updating request" });
    //   }
    // } 
    // else if (req.method === "DELETE") {
    //   try {
    //     const removedRequest = await prisma.request.delete({
    //       where: {
    //         id: req.body.requestID,
    //       },
    //     });

    //     await removeFromOrder(req.body.requestID.toString());

    //     return res.status(200).json({ success: true });
    //   } catch (err) {
    //     console.error(err);
    //     return res
    //       .status(500)
    //       .json({ success: false, message: "error deleting request" });
    //   }
    // } else {
    //   return res.status(405).send(`${req.method} is not a valid method`);
    // }
  }
);

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
      let regionBlocked = false;

      // Check if video is blocked from US
      if (video.contentDetails.regionRestriction) {
        if (!video.contentDetails.regionRestriction.allowed.includes("US")) {
          console.log("Region Blocked");
          regionBlocked = true;
        }
      }

      const createdVideo = await prisma.video.create({
        data: {
          youtube_id: videoID,
          title: video.snippet.title,
          duration: duration,
          thumbnail: `https://i.ytimg.com/vi/${videoID}/mqdefault.jpg`,
          region_blocked: regionBlocked,
          embed_blocked: false,
          channel: video.snippet.channelTitle,
          PG_Status: {
            create: {
              status: "NOT_CHECKED",
            },
          },
        },
      });

      return Promise.resolve(createdVideo);
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
