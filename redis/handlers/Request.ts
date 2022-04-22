import { Entity, EntityCreationData, Repository, Schema } from "redis-om";
import { client, connect } from "../redis";
import { removeFromOrder } from "./Queue";
import { getVideo, Video } from "./Video";

interface Request {
  id?: string;
  requested_by: string;
  video_id: string;
  queue_id: string;
  played: boolean;
  played_at: Date;
}

class Request extends Entity {}

const requestSchema = new Schema(
  Request,
  {
    requested_by: { type: "string" },
    video_id: { type: "string" },
    queue_id: {
      type: "string",
    },
    played: { type: "boolean" },
    played_at: { type: "string" },
  },
  {
    dataStructure: "JSON",
  }
);

export async function createRequestIndex() {
  await connect();

  const repository = client.fetchRepository(requestSchema);

  await repository.createIndex();
}

async function createRequest(data: EntityCreationData) {
  await connect();

  const repository = client.fetchRepository(requestSchema);

  const queue = repository.createEntity(data);

  const id = await repository.save(queue);

  return id;
}

async function getRequestByID(reqID: string) {
  await connect();

  const repository = client.fetchRepository(requestSchema);

  const request = await repository.fetch(reqID);

  return request;
}

async function updateRequest(
  requestID: string | undefined,
  videoID: string | undefined
): Promise<boolean> {
  try {
    if (!requestID || !videoID) {
      console.error("No requestID or videoID specified");
      return false;
    }

    await connect();

    const repository = client.fetchRepository(requestSchema);

    const request = await repository.fetch(requestID);

    request.video_id = videoID;

    const updatedRequestID = repository.save(request);

    return true;
  } catch (e) {
    console.error("Error updating request: ", e);
    return false;
  }
}

async function removeRequest(requestID: string | undefined): Promise<boolean> {
  try {
    if (!requestID) {
      console.error("No requestID specified");

      return false;
    }

    await connect();

    const repository = client.fetchRepository(requestSchema);

    const removedFromQueue = await removeFromOrder(requestID);

    if (removedFromQueue) {
      const removedRequest = await repository.remove(requestID);

      return Promise.resolve(true);
    } else {
      console.error("Error removing from order");
      return Promise.reject(false);
    }
  } catch (e) {
    console.error("Error removing request: ", e);
    return Promise.reject(false);
  }
}

async function checkIfUserAlreadyRequested(username: string | undefined) {
  if (!username) {
    console.error("No username specified");
    return {
      request: null,
      video: null,
    };
  }

  await connect();

  const repository = client.fetchRepository(requestSchema);

  const request = await repository
    .search()
    .where("played")
    .equals(false)
    .and("requested_by")
    .equals(username)
    .returnFirst();

  if (!request) {
    return {
      request: null,
      video: null,
    };
  }

  const video = await getVideo(request.video_id);

  return {
    request: request,
    video: video,
  };
}

async function checkIfVideoAlreadyRequested(
  requestedYTID: string
): Promise<Video | false> {
  await connect();

  const repository = client.fetchRepository(requestSchema);

  const requests = await repository
    .search()
    .where("played")
    .equals(false)
    .return.all();

  if (requests.length > 0) {
    for (let i = 0; i < requests.length; i++) {
      const video = await getVideo(requests[i].video_id);

      if (video) {
        if (video.youtube_id === requestedYTID) {
          return video;
        }
      }
    }
  }

  return false;
}

export {
  Request,
  getRequestByID,
  createRequest,
  updateRequest,
  removeRequest,
  checkIfUserAlreadyRequested,
  checkIfVideoAlreadyRequested,
};
