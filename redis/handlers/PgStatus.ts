import { Entity, EntityCreationData, Repository, Schema } from "redis-om";
import { client, connect } from "../redis";

interface PgStatus {
  id?: string;
  video_id: string;
  status: Status;
  checker: string;
  previous_status: string;
  previous_checker: string;
  last_checked: number;
}

enum Status {
  NotChecked = "NOT_CHECKED",
  BeingChecked = "BEING_CHECKED",
  PG = "PG",
  NonPG = "NON_PG",
}

class PgStatus extends Entity {}

const pgStatusSchema = new Schema(
  PgStatus,
  {
    video_id: { type: "string" },
    status: { type: "string" },
    checker: { type: "string" },
    previous_status: { type: "string" },
    previous_checker: { type: "string" },
    last_checked: { type: "string" },
  },
  {
    dataStructure: "JSON",
  }
);

export async function createPGIndex() {
  await connect();

  const repository = client.fetchRepository(pgStatusSchema);

  await repository.createIndex();
}

export async function getPgStatus(videoID: string) {
  await connect();

  const repository = client.fetchRepository(pgStatusSchema);

  const pgStatus = await repository
    .search()
    .where("video_id")
    .equals(videoID)
    .returnFirst();

  return pgStatus;
}

async function createPgStatus(data: EntityCreationData) {
  await connect();

  const repository = client.fetchRepository(pgStatusSchema);

  const queue = repository.createEntity(data);

  const id = await repository.save(queue);

  return id;
}

async function updatePGStatus(data: any) {
  await connect();

  const repository = client.fetchRepository(pgStatusSchema);

  let pgStatus = await repository.fetch(data.entityID);

  pgStatus.checker = data.checker;
  pgStatus.last_checked = Date.now();
  pgStatus.status = data.status;

  await repository.save(pgStatus);
}

export { PgStatus, Status, createPgStatus, updatePGStatus };
