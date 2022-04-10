import // removeNonPlayedRequests,
"../../redis/handlers/Request";
import type { NextApiRequest, NextApiResponse } from "next";
import { addToQueue, removeFromOrder } from "../../redis/handlers/Queue";
import { getSession } from "@auth0/nextjs-auth0";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import axios from "axios";
import { Request, Video } from "@prisma/client";
import { YTApiResponse } from "../../utils/types";
import { parseYTDuration } from "../../utils/utils";

const requestApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = getSession(req, res);
  console.log(req.body);

  if (req.method === "POST") {
    // TODO: validation
    // console.log(session);
    console.log(req.body);
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

    console.log("VIDEO IN DB?");
    console.log(youtubeID);

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

        return res.status(200).json({ success: true });
      }
      return;
    }

    // If video is already in DB just create a request
    console.log("video in db");
    const createdRequest = await createRequest(
      videoInDB.id,
      req.body.requestedBy
    );

    if (!createRequest) {
      res.status(500).json({ success: false, error: "Error creating request" });
      return;
    }

    const addedToQueue = await addToQueue(createdRequest?.id.toString());

    if (!addedToQueue) {
      res.status(500).json({ success: false, error: "Error adding to queue" });
      return;
    }

    res.status(200).json({ success: true, message: "Request added" });
  } else if (req.method === "DELETE") {
    try {
      const removedRequest = await prisma.request.delete({
        where: {
          id: req.body.requestID,
        },
      });
      console.log("Removed db request: ", removedRequest);

      await removeFromOrder(req.body.requestID.toString());

      res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "error deleting request" });
    }
  } else {
    res.status(405).send(`${req.method} is not a valid method`);
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
      console.log(video);

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
  console.log("CREATE REQUEST");
  console.log({ videoID, username });
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
