import axios from "axios";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";
import { YTApiResponse } from "./types";
import { Video } from "@prisma/client";
import prisma from "./prisma";

export function parseYTDuration(duration: string): number {
  const match = duration.match(/P(\d+Y)?(\d+W)?(\d+D)?T(\d+H)?(\d+M)?(\d+S)?/);
  // An invalid case won't crash the app.
  if (!match) {
    console.error(`Invalid YouTube video duration: ${duration}`);
    return 0;
  }
  const [years, weeks, days, hours, minutes, seconds] = match
    .slice(1)
    .map((_) => (_ ? parseInt(_.replace(/\D/, "")) : 0));
  return (
    (((years * 365 + weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60 +
    seconds
  );
}

export const validateYTUrl = (value: string, queue: any) => {
  let error;
  const parsed = urlParser.parse(value);
  const alreadyRequested = queue.order.findIndex((request) => {
    return request.Video.youtube_id === parsed?.id;
  });

  if (!value) {
    error = "Youtube link required";
  } else if (!parsed) {
    error = "Not valid youtube URL";
  } else if (alreadyRequested != -1) {
    error = "Video is already in the queue";
  }

  return error;
};

export async function createVideo(videoID: string): Promise<Video | undefined> {
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