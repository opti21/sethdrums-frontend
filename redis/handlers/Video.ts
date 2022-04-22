import axios from "axios";
import { Entity, EntityCreationData, Repository, Schema } from "redis-om";
import { client, connect } from "../redis";
import { createPgStatus, Status } from "./PgStatus";

interface Video {
  youtube_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  region_blocked: boolean;
  embed_blocked: boolean;
  duration: number;
  notes: string;
  banned: boolean;
}

class Video extends Entity {}

const videoSchema = new Schema(
  Video,
  {
    youtube_id: { type: "string" },
    title: { type: "string" },
    channel: { type: "string" },
    thumbnail: { type: "string" },
    region_blocked: { type: "boolean" },
    embed_blocked: { type: "boolean" },
    duration: { type: "number" },
    notes: { type: "string" },
    banned: { type: "boolean" },
  },
  {
    dataStructure: "JSON",
  }
);

export async function createVideoIndex() {
  await connect();

  const repository = client.fetchRepository(videoSchema);

  await repository.createIndex();
}

async function getVideo(videoID: string) {
  await connect();

  const repository = client.fetchRepository(videoSchema);

  const video = await repository.fetch(videoID);

  return video;
}

async function getVideoByYtID(videoID: string) {
  await connect();

  const repository = client.fetchRepository(videoSchema);

  const video = await repository
    .search()
    .where("youtube_id")
    .equals(videoID)
    .returnFirst();

  return video;
}

async function createVideo(videoID: string): Promise<Video | undefined> {
  try {
    const axiosResponse = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoID}&key=${process.env.GOOGLE_API_KEY}`
    );

    if (axiosResponse.data.items[0]) {
      await connect();

      const repository = client.fetchRepository(videoSchema);
      const apiData = axiosResponse.data;
      const videoData = apiData.items[0];
      const duration = parseYTDuration(videoData.contentDetails.duration);

      const video = repository.createEntity({
        youtube_id: videoID,
        title: videoData.snippet.title,
        duration: duration,
        region_blocked: false,
        embed_blocked: false,
        channel: videoData.snippet.channelTitle,
        thumbnail: `https://i.ytimg.com/vi/${videoID}/mqdefault.jpg`,
        notes: "",
        banned: false,
      });

      const createdVideoID = await repository.save(video);

      const createdPG = await createPgStatus({
        video_id: createdVideoID,
        status: Status.NotChecked,
        checker: "",
        previous_status: "",
        previous_checker: "",
        last_checked: "",
      });

      const createdVideo = await repository.fetch(createdVideoID);

      return createdVideo;
    }
  } catch (e) {
    console.error(e);

    await connect();

    const repository = client.fetchRepository(videoSchema);

    const video = repository.createEntity({
      youtube_id: videoID,
      title: "NEED TO MANUALLY CHECK",
      duration: 0,
      region_blocked: false,
      embed_blocked: false,
      channel: "",
      thumbnail: `https://i.ytimg.com/vi/${videoID}/mqdefault.jpg`,
      notes: "",
      banned: false,
    });

    const createdVideoID = await repository.save(video);

    const createdPG = await createPgStatus({
      video_id: createdVideoID,
      status: Status.NotChecked,
      checker: "",
      previous_status: "",
      previous_checker: "",
      last_checked: "",
    });

    const createdVideo = await repository.fetch(createdVideoID);

    return createdVideo;
  }
}

function parseYTDuration(duration: string): number {
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

export { Video, createVideo, getVideoByYtID, videoSchema, getVideo };
