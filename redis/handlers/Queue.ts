import { Entity, EntityCreationData, Repository, Schema } from "redis-om";
import { client, connect } from "../redis";

const QUEUE_ID = process.env.QUEUE_ID ? process.env.QUEUE_ID : "";

interface Queue {
  order: string[];
  is_updating: boolean;
  being_updated_by: string;
  currently_playing: string;
}

class Queue extends Entity {}

const queueSchema = new Schema(
  Queue,
  {
    order: { type: "string[]" },
    prioOrder: { type: "string[]" },
    is_updating: { type: "boolean" },
    being_updated_by: { type: "string" },
    currently_playing: { type: "string" },
  },
  {
    dataStructure: "JSON",
  }
);

export async function createQueueIndex() {
  await connect();

  const repository = client.fetchRepository(queueSchema);

  await repository.createIndex();
}

async function getQueue() {
  await connect();

  const repository = client.fetchRepository(queueSchema);

  const queue = await repository.fetch(QUEUE_ID);

  return queue;
}

async function createQueue(data: EntityCreationData) {
  await connect();

  const repository = client.fetchRepository(queueSchema);

  const queue = repository.createEntity(data);

  const id = await repository.save(queue);

  return id;
}

async function lockQueue() {
  await connect();

  console.log("lock");

  const repository = client.fetchRepository(queueSchema);

  const queue = await repository.fetch(QUEUE_ID);

  queue.is_updating = true;
  queue.being_updated_by = "PEPEGA BOT";

  repository.save(queue);

  return queue;
}

async function unLockQueue() {
  await connect();

  console.log("unlock");

  const repository = client.fetchRepository(queueSchema);

  const queue = await repository.fetch(QUEUE_ID);

  queue.being_updated_by = "";
  queue.is_updating = false;

  repository.save(queue);

  return queue;
}

async function addToQueue(
  requestID: string | undefined
): Promise<boolean | undefined> {
  try {
    if (!requestID) {
      console.error("No requestID passed");
      return;
    }

    console.log("UPDATING QUEUE");
    console.log("adding ", requestID);

    lockQueue();

    await connect();

    const repository = client.fetchRepository(queueSchema);

    const queue = await repository.fetch(QUEUE_ID);

    queue?.order?.push(requestID);

    await repository.save(queue);

    unLockQueue();

    return true;
  } catch (e) {
    console.error("Error adding to queue: ", e);
    return Promise.reject(e);
  }
}

async function removeFromOrder(
  requestID: string | undefined
): Promise<boolean> {
  try {
    lockQueue();

    await connect();

    const repository = client.fetchRepository(queueSchema);

    const queue = await repository.fetch(QUEUE_ID);

    if (queue.order) {
      for (let i = 0; i < queue.order.length; i++) {
        if (queue.order[i] === requestID) {
          queue.order.splice(i, 1);
        }
      }
    }

    await repository.save(queue);

    unLockQueue();

    return true;
  } catch (e) {
    return Promise.reject("Error removing from order");
  }
}

async function updateOrder(updatedOrderData: any): Promise<boolean> {
  try {
    const updatedOrder = updatedOrderData.map((request: any) => {
      return request.id;
    });

    lockQueue();

    await connect();

    const repository = client.fetchRepository(queueSchema);

    const queue = await repository.fetch(QUEUE_ID);

    queue.order = updatedOrder;

    await repository.save(queue);

    unLockQueue();

    return true;
  } catch (e) {
    return Promise.reject("Error updating queue");
  }
}

async function updateOrderPrio(updatedOrder: any): Promise<boolean> {
  try {
    console.log(updatedOrder);
    lockQueue();

    await connect();

    const repository = client.fetchRepository(queueSchema);

    const queue = await repository.fetch(QUEUE_ID);

    queue.order = updatedOrder;

    await repository.save(queue);

    unLockQueue();

    return true;
  } catch (e) {
    console.log(e);
    return Promise.reject("Error updating queue");
  }
}

export {
  Queue,
  getQueue,
  createQueue,
  lockQueue,
  unLockQueue,
  addToQueue,
  removeFromOrder,
  updateOrder,
  updateOrderPrio,
};
