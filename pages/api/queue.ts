import { getQueue, updateOrder } from "../../redis/handlers/Queue";
import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestByID } from "../../redis/handlers/Request";
import { prisma } from "../../utils/prisma";
import { getVideo } from "../../redis/handlers/Video";
import { getPgStatus } from "../../redis/handlers/PgStatus";

const queueApiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    try {
      const queue = await getQueue();

      if (!queue) {
        res.status(500).json({ error: "Error getting queue" });
      }
      // console.log(queue);

      let requests = [];

      for (let i = 0; i < queue?.order?.length; i++) {
        const requestEntity = await getRequestByID(queue.order[i]);
        let requestData = requestEntity.entityData;
        const videoEntity = await getVideo(requestData.video_id.toString());
        const videoData = videoEntity.entityData;

        const pgStatusData = await getPgStatus(videoEntity.entityId);

        const request = {
          id: requestEntity.entityId,
          ...requestData,
          video: videoData,
          pgStatus: pgStatusData,
        };

        requests.push(request);
      }

      const queueResponse = {
        order: requests,
        is_updating: queue.is_updating,
        being_updated_by: queue.being_updated_by,
      };
      // console.log(queueResponse);
      res.status(200).json(queueResponse);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  } else if (req.method === "POST") {
    //   // TODO: validate body
    const newQueue = req.body;
    // console.log(newQueue);
    const didUpdateQueue = await updateOrder(newQueue.updatedOrder);
    if (!didUpdateQueue) {
      res.status(500).json({ error: "Error updating order" });
    }
    return res.status(200).json({ success: true });
  } else {
    res.status(405).send(`${req.method} is not a valid`);
  }
};

export default queueApiHandler;
