import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { placeInGroup } from "../../lib/shared/queue-order";

const SECRET = "test-secret";
let roomSeq = 0;

async function rpc(room: string, op: Record<string, unknown>, secret = SECRET) {
  const response = await exports.default.fetch("https://queue.test/rpc", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ room, ...op }),
  });
  return { status: response.status, body: (await response.json()) as any };
}

function newRoom() {
  roomSeq += 1;
  return `test-${roomSeq}`;
}

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function token(payload: Record<string, unknown>, secret = SECRET) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return `${body}.${b64url(signature)}`;
}

async function connect(room: string, sub: string) {
  const t = await token({ sub, username: sub, room, exp: Math.floor(Date.now() / 1000) + 60 });
  const response = await exports.default.fetch(`https://queue.test/ws?token=${t}`, {
    headers: { Upgrade: "websocket" },
  });
  expect(response.status).toBe(101);
  const ws = response.webSocket!;
  const messages: any[] = [];
  ws.addEventListener("message", (event) => {
    messages.push(JSON.parse(event.data as string));
  });
  ws.accept();
  return { ws, messages };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("placeInGroup", () => {
  const kinds = { p1: "priority", p2: "priority", m1: "mod_prio" } as const;

  it("puts a new priority song after the last priority song", () => {
    expect(placeInGroup(["p1", "p2", "m1", "a", "b"], kinds, "b", "priority", "end")).toEqual([
      "p1",
      "p2",
      "b",
      "m1",
      "a",
    ]);
  });

  it("isn't thrown off by ids above the priority block", () => {
    // A stale id at the top used to shift a count-based index by one.
    expect(placeInGroup(["gone", "p1", "p2", "a", "b"], kinds, "b", "priority", "end")).toEqual([
      "gone",
      "p1",
      "p2",
      "b",
      "a",
    ]);
  });

  it("puts mod priority after every priority song", () => {
    expect(placeInGroup(["p1", "a", "p2", "b"], kinds, "b", "mod_prio", "end")).toEqual(["p1", "a", "p2", "b"]);
    expect(placeInGroup(["p1", "p2", "m1", "a", "b"], kinds, "b", "mod_prio", "end")).toEqual([
      "p1",
      "p2",
      "m1",
      "b",
      "a",
    ]);
  });

  it("returns songs to the top of their group", () => {
    const order = ["p1", "p2", "m1", "a"];
    expect(placeInGroup(order, kinds, "x", "priority", "start")).toEqual(["x", "p1", "p2", "m1", "a"]);
    expect(placeInGroup(order, kinds, "x", "mod_prio", "start")).toEqual(["p1", "p2", "x", "m1", "a"]);
    expect(placeInGroup(order, kinds, "x", "none", "start")).toEqual(["p1", "p2", "m1", "x", "a"]);
    expect(placeInGroup(order, kinds, "x", "none", "end")).toEqual(["p1", "p2", "m1", "a", "x"]);
  });

  it("works on an empty list", () => {
    expect(placeInGroup([], {}, "x", "mod_prio", "end")).toEqual(["x"]);
  });
});

describe("worker", () => {
  it("rejects calls without the secret", async () => {
    const { status } = await rpc(newRoom(), { op: "get" }, "wrong");
    expect(status).toBe(401);
  });

  it("rejects sockets without a valid token", async () => {
    const bad = await exports.default.fetch("https://queue.test/ws?token=nope", { headers: { Upgrade: "websocket" } });
    expect(bad.status).toBe(401);
    const forged = await token({ sub: "x", username: "x", room: "r", exp: Date.now() / 1000 + 60 }, "other");
    const res = await exports.default.fetch(`https://queue.test/ws?token=${forged}`, {
      headers: { Upgrade: "websocket" },
    });
    expect(res.status).toBe(401);
    const expired = await token({ sub: "x", username: "x", room: "r", exp: 1 });
    const res2 = await exports.default.fetch(`https://queue.test/ws?token=${expired}`, {
      headers: { Upgrade: "websocket" },
    });
    expect(res2.status).toBe(401);
  });

  it("imports once, then refuses to overwrite without force", async () => {
    const room = newRoom();
    const first = await rpc(room, { op: "import", state: { order: [1, 2, "3"], is_open: true, now_playing: 7 } });
    expect(first.body.state).toMatchObject({ order: ["1", "2", "3"], is_open: true, now_playing: "7" });
    const again = await rpc(room, { op: "import", state: { order: [] } });
    expect(again.status).toBe(400);
    const forced = await rpc(room, { op: "import", state: { order: ["9"] }, force: true });
    expect(forced.body.state.order).toEqual(["9"]);
  });

  it("applies queue changes in order without losing any", async () => {
    const room = newRoom();
    // 50 adds at once: every one must land, none lost to a race.
    await Promise.all(Array.from({ length: 50 }, (_, i) => rpc(room, { op: "add", id: String(i) })));
    const { body } = await rpc(room, { op: "get" });
    expect(body.state.order).toHaveLength(50);
    expect(new Set(body.state.order).size).toBe(50);
    expect(body.version).toBe(50);
  });

  it("merges a stale reorder with songs added since", async () => {
    const room = newRoom();
    await rpc(room, { op: "import", state: { order: ["a", "b", "c"] } });
    await rpc(room, { op: "add", id: "d" });
    await rpc(room, { op: "remove", ids: ["b"] });
    const { body } = await rpc(room, { op: "reorder", order: ["c", "b", "a"] });
    expect(body.state.order).toEqual(["c", "a", "d"]);
  });

  it("moves, places and claims", async () => {
    const room = newRoom();
    await rpc(room, { op: "import", state: { order: ["p1", "a", "b"] } });
    const moved = await rpc(room, { op: "move", id: "b", index: 0 });
    expect(moved.body).toMatchObject({ result: true, state: { order: ["b", "p1", "a"] } });
    const missing = await rpc(room, { op: "move", id: "zz", index: 0 });
    expect(missing.body).toMatchObject({ result: false, changed: false });

    const placed = await rpc(room, {
      op: "place",
      id: "a",
      kind: "priority",
      edge: "end",
      kinds: { p1: "priority" },
    });
    expect(placed.body.state.order).toEqual(["b", "p1", "a"]);

    expect((await rpc(room, { op: "claim", id: "a" })).body.result).toBe(true);
    expect((await rpc(room, { op: "claim", id: "a" })).body.result).toBe(false);
    await rpc(room, { op: "release", id: "a" });
    expect((await rpc(room, { op: "claim", id: "a" })).body.result).toBe(true);
  });

  it("only sets known flag fields", async () => {
    const room = newRoom();
    const { body } = await rpc(room, {
      op: "setFields",
      fields: { is_open: true, now_playing: 12, order: ["hack"] },
    });
    expect(body.state).toMatchObject({ is_open: true, now_playing: "12", order: [] });
  });

  it("keeps state after the object is evicted", async () => {
    const room = newRoom();
    await rpc(room, { op: "import", state: { order: ["a", "b"], is_open: true } });
    const stub = env.QUEUE_ROOM.get(env.QUEUE_ROOM.idFromName(room));
    const { evictDurableObject } = await import("cloudflare:test");
    await evictDurableObject(stub);
    const { body } = await rpc(room, { op: "get" });
    expect(body.state).toMatchObject({ order: ["a", "b"], is_open: true });
    expect(body.version).toBe(1);
  });

  it("tells every open panel about each change, and who is online", async () => {
    const room = newRoom();
    const a = await connect(room, "mod-a");
    const b = await connect(room, "mod-b");
    await tick();
    expect(a.messages[0]).toMatchObject({ type: "hello" });
    expect(a.messages.at(-1)).toMatchObject({ type: "members" });
    expect(a.messages.at(-1).members.map((m: any) => m.id).sort()).toEqual(["mod-a", "mod-b"]);

    await rpc(room, { op: "add", id: "1" });
    await rpc(room, { op: "remove", ids: ["1"] });
    await rpc(room, { op: "remove", ids: ["1"] }); // no change, no event
    await tick();
    const events = b.messages.filter((m) => m.type === "event").map((m) => m.event);
    expect(events).toEqual(["queue-add", "update-queue"]);

    const relayed = await exports.default.fetch("https://queue.test/broadcast", {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({ room, event: "raffle-start", data: { length: 60 } }),
    });
    expect(await relayed.json()).toEqual({ sent: 2 });
    await tick();
    expect(a.messages.at(-1)).toEqual({ type: "event", event: "raffle-start", data: { length: 60 } });

    b.ws.close(1000, "bye");
    await tick();
    const last = a.messages.filter((m) => m.type === "members").at(-1);
    expect(last.members.map((m: any) => m.id)).toEqual(["mod-a"]);
    a.ws.close(1000, "bye");
  });
});
