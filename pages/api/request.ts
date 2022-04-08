import {
  checkIfVideoAlreadyRequested,
  createRequest,
  getRequestByID,
  removeRequest,
  // removeNonPlayedRequests,
} from "../../redis/handlers/Request";
import type { NextApiRequest, NextApiResponse } from "next";
import { createVideo, getVideoByYtID } from "../../redis/handlers/Video";
import { addToQueue } from "../../redis/handlers/Queue";
import { getSession } from "@auth0/nextjs-auth0";
import urlParser from "js-video-url-parser";
import "js-video-url-parser/lib/provider/youtube";

const requestApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = getSession(req, res);

  if (req.method === "GET") {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: "missing id" });
    }

    const request = await getRequestByID(ids.toString());

    if (request) {
      res.status(200).json({
        request: request.entityData,
      });
    } else {
      res.status(500).json({ error: "Error getting queue" });
    }
  } else if (req.method === "POST") {
    // TODO: validation
    console.log(session);
    console.log(req.body);
    const parsed = urlParser.parse(req.body.ytLink);
    const youtubeID = parsed?.id;

    if (!youtubeID) {
      return res
        .status(400)
        .json({ success: false, error: "not a valid youtube URL" });
    }

    // Check if video is in database
    const videoInDB = await getVideoByYtID(youtubeID);

    console.log("VIDEO IN DB?");
    console.log(youtubeID);

    if (!videoInDB) {
      // Video doesn't exist on database
      // Make new video then request
      const createdVideo = await createVideo(youtubeID);

      if (createdVideo) {
        const createdRequest = await createRequest({
          requested_by: req.body.submittedBy,
          video_id: createdVideo.entityId,
          played: false,
          played_at: "",
        });

        const addedToQueue = await addToQueue(createdRequest);

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
    const createdRequest = await createRequest({
      requested_by: req.body.submittedBy,
      video_id: videoInDB.entityId,
      played: false,
      played_at: "",
    });

    if (!createRequest) {
      res.status(500).json({ success: false, error: "Error creating request" });
      return;
    }

    const addedToQueue = await addToQueue(createdRequest);

    if (!addedToQueue) {
      res.status(500).json({ success: false, error: "Error adding to queue" });
      return;
    }

    res.status(200).json({ success: true, message: "Request added" });
  } else if (req.method === "DELETE") {
    try {
      await removeRequest(req.body.requestID);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "error deleting request" });
    }
  } else {
    res.status(405).send(`${req.method} is not a valid`);
  }
};

export default requestApiHandler;
