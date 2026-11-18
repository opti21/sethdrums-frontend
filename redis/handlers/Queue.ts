import { Entity, EntityCreationData, Repository, Schema } from "redis-om";
import { client, connect } from "../redis";

const QUEUE_ID = process.env.QUEUE_ID ? process.env.QUEUE_ID : "";

interface Queue {
  order: string[];
  is_updating: boolean;
  is_paused: boolean;
  being_updated_by: string;
  now_playing: string;
  is_open: boolean;
  currently_processing: string[];
  is_subOnly: boolean;
}

class Queue extends Entity {}

const queueSchema = new Schema(
  Queue,
  {
    order: { type: "string[]" },
    is_updating: { type: "boolean" },
    is_paused: { type: "boolean" },
    being_updated_by: { type: "string" },
    now_playing: { type: "string" },
    is_open: { type: "boolean" },
    currently_processing: { type: "string[]" },
    is_subOnly: { type: "boolean" },
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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => item != null && item !== "").map(String);
}

function withQueueDefaults(queue: Queue | null): Queue {
  // redis-om JSON entities return null for missing array/string/boolean fields.
  if (!queue) {
    throw new Error("Queue entity not found");
  }

  queue.order = asStringArray(queue.order);
  queue.currently_processing = asStringArray(queue.currently_processing);
  queue.now_playing =
    typeof queue.now_playing === "string" ? queue.now_playing : "";
  queue.being_updated_by =
    typeof queue.being_updated_by === "string" ? queue.being_updated_by : "";
  queue.is_updating = Boolean(queue.is_updating);
  queue.is_paused = Boolean(queue.is_paused);
  queue.is_open = Boolean(queue.is_open);
  queue.is_subOnly = Boolean(queue.is_subOnly);

  return queue;
}

async function getQueue() {
  await connect();

  const repository = client.fetchRepository(queueSchema);

  const queue = await repository.fetch(QUEUE_ID);

  if (!queue) {
    return queue;
  }

  return withQueueDefaults(queue);
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

  const repository = client.fetchRepository(queueSchema);

  const queue = withQueueDefaults(await repository.fetch(QUEUE_ID));

  queue.is_updating = true;
  queue.being_updated_by = "PEPEGA BOT";

  repository.save(queue);

  return queue;
}

async function unLockQueue() {
  await connect();

  const repository = client.fetchRepository(queueSchema);

  const queue = withQueueDefaults(await repository.fetch(QUEUE_ID));

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

    lockQueue();

    await connect();

    const repository = client.fetchRepository(queueSchema);

    const queue = withQueueDefaults(await repository.fetch(QUEUE_ID));

    queue.order.push(requestID);

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

    const queue = withQueueDefaults(await repository.fetch(QUEUE_ID));

    for (let i = 0; i < queue.order.length; i++) {
      if (queue.order[i] === requestID) {
        queue.order.splice(i, 1);
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
    if (!Array.isArray(updatedOrderData)) {
      return Promise.reject("Error updating queue");
    }

    const updatedOrder = updatedOrderData.map((request: any) => {
      return request.id;
    });

    lockQueue();

    await connect();

    const repository = client.fetchRepository(queueSchema);

    const queue = withQueueDefaults(await repository.fetch(QUEUE_ID));

    queue.order = updatedOrder;

    await repository.save(queue);

    unLockQueue();

    return true;
  } catch (e) {
    return Promise.reject("Error updating queue");
  }
}

async function updateOrderIdStrings(updatedOrder: string[]): Promise<boolean> {
  try {
    lockQueue();

    await connect();

    const repository = client.fetchRepository(queueSchema);

    const queue = withQueueDefaults(await repository.fetch(QUEUE_ID));

    queue.order = updatedOrder;

    await repository.save(queue);

    unLockQueue();

    return true;
  } catch (e) {
    console.error(e);
    return Promise.reject("Error updating queue");
  }
}

async function updateNowPlaying(requestID: string): Promise<boolean> {
  try {
    lockQueue();

    await connect();

    const repository = client.fetchRepository(queueSchema);

    const queue = withQueueDefaults(await repository.fetch(QUEUE_ID));

    queue.now_playing = requestID;

    await repository.save(queue);

    unLockQueue();

    return true;
  } catch (e) {
    console.error(e);
    return Promise.reject("Error updating now playing");
  }
}

async function setPrioAsProcessing(requestID: string) {
  await connect();

  const repository = client.fetchRepository(queueSchema);

  const queue = withQueueDefaults(await repository.fetch(QUEUE_ID));

  queue.currently_processing.push(requestID);

  await repository.save(queue);
}

async function removePrioFromProcessing(requestID: string) {
  await connect();

  const repository = client.fetchRepository(queueSchema);

  const queue = withQueueDefaults(await repository.fetch(QUEUE_ID));

  for (let i = 0; i < queue.currently_processing.length; i++) {
    if (queue.currently_processing[i] === requestID) {
      queue.currently_processing.splice(i, 1);
    }
  }

  await repository.save(queue);
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
  updateOrderIdStrings,
  updateNowPlaying,
  setPrioAsProcessing,
  removePrioFromProcessing,
};
