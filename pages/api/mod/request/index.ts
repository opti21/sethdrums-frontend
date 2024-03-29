import // removeNonPlayedRequests,
"../../../../redis/handlers/Request";
import type { NextApiRequest, NextApiResponse } from "next";
import { addToQueue, removeFromOrder } from "../../../../redis/handlers/Queue";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import axios from "axios";
import { Request, Video } from "@prisma/client";
import { YTApiResponse } from "../../../../utils/types";
import { parseYTDuration } from "../../../../utils/utils";
import prisma from "../../../../utils/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const requestApiHandler = withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
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
      // TODO: validation
      const parsed = urlParser.parse(req.body.ytLink);
      const youtubeID = parsed?.id;

      if (!youtubeID) {
        return res
          .status(400)
          .json({ success: false, error: "not a valid youtube URL" });
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
            req.body.requestedBy,
            ""
          );

          const addedToQueue = await addToQueue(createdRequest?.id.toString());

          if (!addedToQueue) {
            return res
              .status(500)
              .json({ success: false, error: "Error adding to queue" });
          }

          return res.status(200).json({ success: true });
        }
        return;
      }

      if (videoInDB.banned) {
        return res
          .status(422)
          .json({ success: false, error: "Video is banned" });
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
        req.body.requestedBy,
        ""
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

      res.status(200).json({ success: true, message: "Request added" });
    } else if (req.method === "PUT") {
      if (!req.body.requestID) {
        console.error("Missing requestID in body");
        return res.status(422).send("Body missing reuquestID");
      }
      try {
        await prisma.request.update({
          where: {
            id: parseInt(req.body.requestID),
          },
          data: {
            played: req.body.played,
            played_at: dayjs.utc().format(),
          },
        });
        return res
          .status(200)
          .json({ success: true, message: "Request updated" });
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .json({ success: false, message: "error updating request" });
      }
    } else if (req.method === "DELETE") {
      try {
        const removedRequest = await prisma.request.delete({
          where: {
            id: req.body.requestID,
          },
        });

        await removeFromOrder(req.body.requestID.toString());

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
      if (video.contentDetails.regionRestriction && video.contentDetails.regionRestriction.allowed) {
        if (!video.contentDetails.regionRestriction.allowed.includes("US")) {
          console.log("Region Blocked");
          regionBlocked = true;
        }
      } else if (video.contentDetails.regionRestriction && video.contentDetails.regionRestriction.blocked) {
        console.log(video.contentDetails.regionRestriction.blocked)
        if (video.contentDetails.regionRestriction.blocked.includes("US")) {
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
