# Queue Worker

A Cloudflare Worker with one Durable Object (`QueueRoom`) that holds the
suggestion list and sends live updates to open mod panels. It can replace the
shared Redis document and Pusher. Both apps pick it with env vars, so it can
be turned on, and off again, without a deploy of new code.

## How it fits

- The frontend (`lib/server/queue.ts`) and the chat bot (`src/redis/queueState.ts`)
  call `POST /rpc` with `Authorization: Bearer $QUEUE_WORKER_SECRET`.
- `QueueRoom` runs one change at a time and saves it before replying, so no
  change can be lost to a race. After every change it sends an event to every
  connected panel. Callers no longer have to remember to.
- `POST /broadcast` relays events that aren't queue changes (PG status, raffle,
  drag lock).
- Mod panels open `GET /ws?token=...`. The token comes from the frontend's
  `/api/realtime/token`, signed with the same secret and valid for 60 seconds.
  Presence (mods online) comes from the open sockets.
- Placement rules for priority songs live in `../lib/shared/queue-order.ts`,
  shared with the Redis code path. The bot keeps a copy in `src/redis/queueOrder.ts`.

## Develop

```sh
cd queue-worker
pnpm install --ignore-workspace
cp .dev.vars.example .dev.vars
pnpm test        # Vitest inside the Workers runtime
pnpm dev         # http://localhost:8787
```

## Deploy

```sh
npx wrangler login              # or CLOUDFLARE_API_TOKEN
npx wrangler secret put QUEUE_WORKER_SECRET
pnpm deploy
```

Optionally add a custom domain such as `queue.sethdrums.tv` in `wrangler.jsonc`.

## Switching over

Env vars, on the frontend **and** the chat bot:

| Var | Values |
| --- | --- |
| `QUEUE_BACKEND` | `redis` (default) or `do` |
| `REALTIME_BACKEND` | `pusher` (default) or `do` |
| `QUEUE_WORKER_URL` | e.g. `https://sethdrums-queue.<account>.workers.dev` |
| `QUEUE_WORKER_SECRET` | same value as the Worker secret |

1. Deploy the Worker. Set `QUEUE_WORKER_URL` and `QUEUE_WORKER_SECRET` on both services.
2. Between streams, close the list (`!close`), then copy Redis into the Worker:
   `doppler run -- node scripts/queue-migrate.mjs import`
3. Set `QUEUE_BACKEND=do` on both services, then check with `... compare`.
4. Set `REALTIME_BACKEND=do` on both. Panels pick it up on reload.
5. To roll back: `... export`, then set both vars back.

Both services must use the same `QUEUE_BACKEND`.
