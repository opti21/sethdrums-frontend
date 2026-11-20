import { DurableObject } from "cloudflare:workers";
import {
  mergeOrder,
  move,
  placeInGroup,
  withoutIds,
  type GroupEdge,
  type PrioKind,
} from "../../lib/shared/queue-order";

/**
 * The suggestion list, one instance per QUEUE_ID.
 *
 * A Durable Object runs one request at a time, so every change below reads
 * the latest state and nothing can be lost between a read and a write: no
 * WATCH, no retries. Each change is saved before the reply goes out, then
 * sent to every connected panel. Callers never send the live update
 * themselves, so none of them can forget to.
 *
 * Field names match the old Redis document (`Queue:<QUEUE_ID>`), so the
 * import is a straight copy and the apps keep their QueueState type.
 */
export type QueueState = {
  order: string[];
  is_updating: boolean;
  is_paused: boolean;
  being_updated_by: string;
  now_playing: string;
  is_open: boolean;
  currently_processing: string[];
  is_subOnly: boolean;
};

export type QueueFlags = Partial<
  Pick<QueueState, "is_updating" | "is_paused" | "being_updated_by" | "now_playing" | "is_open" | "is_subOnly">
>;

export type Member = { id: string; username: string; picture?: string };

/** Every operation the apps can run. `result` is op-specific. */
export type QueueOp =
  | { op: "get" }
  | { op: "add"; id: string }
  | { op: "remove"; ids: string[] }
  | { op: "reorder"; order: string[] }
  | { op: "move"; id: string; index: number }
  | { op: "place"; id: string; kind: PrioKind; edge: GroupEdge; kinds: Record<string, PrioKind> }
  | { op: "setFields"; fields: QueueFlags }
  | { op: "claim"; id: string }
  | { op: "release"; id: string }
  | { op: "import"; state: Partial<QueueState>; force?: boolean }
  | { op: "export" };

export type QueueReply = { state: QueueState; version: number; changed: boolean; result?: unknown };

const EMPTY: QueueState = {
  order: [],
  is_updating: false,
  is_paused: false,
  being_updated_by: "",
  now_playing: "",
  is_open: false,
  currently_processing: [],
  is_subOnly: false,
};

const FLAG_KEYS = ["is_updating", "is_paused", "being_updated_by", "now_playing", "is_open", "is_subOnly"] as const;

function ids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => item != null && item !== "").map(String))];
}

/** Coerce anything (an import, an old Redis doc) into a clean state. */
export function normalize(raw: Partial<QueueState> | null | undefined): QueueState {
  const doc = (raw ?? {}) as Record<string, unknown>;
  return {
    order: ids(doc.order),
    currently_processing: ids(doc.currently_processing),
    now_playing: doc.now_playing == null ? "" : String(doc.now_playing),
    being_updated_by: typeof doc.being_updated_by === "string" ? doc.being_updated_by : "",
    is_updating: Boolean(doc.is_updating),
    is_paused: Boolean(doc.is_paused),
    is_open: Boolean(doc.is_open),
    is_subOnly: Boolean(doc.is_subOnly),
  };
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

export class QueueRoom extends DurableObject<Env> {
  private state: QueueState = EMPTY;
  private version = 0;
  private imported = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Answer keepalive pings without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<{ state: QueueState; version: number }>("queue");
      if (saved) {
        this.state = normalize(saved.state);
        this.version = saved.version;
        this.imported = true;
      }
    });
  }

  /** Run one operation. Called over RPC by the Worker. */
  async apply(input: QueueOp): Promise<QueueReply> {
    const before = this.state;
    let next: QueueState = before;
    let result: unknown;
    let event = "update-queue";

    switch (input.op) {
      case "get":
      case "export":
        return this.reply(false);

      case "import": {
        if (this.imported && !input.force) {
          throw new Error("Queue already has data; pass force to overwrite");
        }
        next = normalize(input.state);
        this.imported = true;
        break;
      }

      case "add": {
        const id = String(input.id);
        if (!before.order.includes(id)) {
          next = { ...before, order: [...before.order, id] };
          event = "queue-add";
        }
        result = true;
        break;
      }

      case "remove":
        next = { ...before, order: withoutIds(before.order, ids(input.ids)) };
        break;

      case "reorder":
        next = { ...before, order: mergeOrder(before.order, ids(input.order)) };
        break;

      case "move": {
        const id = String(input.id);
        const from = before.order.indexOf(id);
        result = from !== -1;
        if (from !== -1) next = { ...before, order: move(before.order, from, Math.trunc(input.index)) };
        break;
      }

      case "place":
        next = {
          ...before,
          order: placeInGroup(before.order, input.kinds ?? {}, String(input.id), input.kind, input.edge),
        };
        break;

      case "setFields": {
        const fields: Partial<QueueState> = {};
        for (const key of FLAG_KEYS) {
          if (key in input.fields) {
            const value = input.fields[key];
            (fields as Record<string, unknown>)[key] =
              key === "now_playing" || key === "being_updated_by" ? String(value ?? "") : Boolean(value);
          }
        }
        next = { ...before, ...fields };
        break;
      }

      case "claim": {
        const id = String(input.id);
        result = !before.currently_processing.includes(id);
        if (result) next = { ...before, currently_processing: [...before.currently_processing, id] };
        break;
      }

      case "release":
        next = { ...before, currently_processing: withoutIds(before.currently_processing, [String(input.id)]) };
        break;

      default:
        throw new Error(`Unknown op ${(input as { op: string }).op}`);
    }

    const changed = !this.equal(before, next) || input.op === "import";
    if (changed) {
      this.state = next;
      this.version += 1;
      // Storage writes finish before the reply leaves (output gate), so a
      // caller never sees a change that could be lost.
      await this.ctx.storage.put("queue", { state: this.state, version: this.version });
      // Claim/release only guard against two mods moving one song; panels
      // don't show them, and an event mid-change would make them refetch an
      // in-between list.
      if (input.op !== "claim" && input.op !== "release") {
        this.send({ type: "event", event, data: { version: this.version } });
      }
    }
    return this.reply(changed, result);
  }

  /** Relay an event that isn't a queue change (PG status, raffle, drag lock). */
  async broadcast(event: string, data: unknown): Promise<number> {
    return this.send({ type: "event", event, data: data ?? {} });
  }

  /** The Worker has already checked the panel's token. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }
    const member = JSON.parse(request.headers.get("X-Member") ?? "null") as Member | null;
    if (!member?.id) {
      return new Response("Missing member", { status: 400 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    // Hibernation API: idle sockets don't keep the object awake or billed.
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(member);
    server.send(JSON.stringify({ type: "hello", version: this.version, members: this.members() }));
    this.sendMembers();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage() {
    // Panels only listen. "ping" is answered by the auto-response above.
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 ? 1000 : code, "closed");
    } catch {
      // Already closed.
    }
    this.sendMembers(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.sendMembers(ws);
  }

  private reply(changed: boolean, result?: unknown): QueueReply {
    return { state: this.state, version: this.version, changed, result };
  }

  private equal(a: QueueState, b: QueueState) {
    return (
      sameList(a.order, b.order) &&
      sameList(a.currently_processing, b.currently_processing) &&
      FLAG_KEYS.every((key) => a[key] === b[key])
    );
  }

  private members(leaving?: WebSocket): Member[] {
    const byId = new Map<string, Member>();
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === leaving) continue;
      const member = ws.deserializeAttachment() as Member | null;
      if (member?.id) byId.set(member.id, member);
    }
    return [...byId.values()];
  }

  private sendMembers(leaving?: WebSocket) {
    this.send({ type: "members", members: this.members(leaving) }, leaving);
  }

  private send(message: unknown, skip?: WebSocket): number {
    const text = JSON.stringify(message);
    let sent = 0;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === skip) continue;
      try {
        ws.send(text);
        sent += 1;
      } catch {
        // A socket that is closing; webSocketClose cleans up.
      }
    }
    return sent;
  }
}
