# SethDrums Song Panel

The song suggestion panel for SethDrums' stream: the public suggestion list, the mod panel, Seth's view, the played history and each viewer's saved songs.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, Prisma 7 on Turso (libSQL), Redis and Pusher.

## How it fits with the chat bot

[`sethdrums-chat-bot`](https://github.com/opti21/sethdrums-chat-bot) shares three things with this app. Keep them compatible:

- **Redis**: the suggestion list order and flags live in the RedisJSON document `Queue:<QUEUE_ID>` (fields `order`, `now_playing`, `is_open`, `is_paused`, `is_subOnly`, `is_updating`, `being_updated_by`, `currently_processing`). See `lib/server/queue.ts`.
- **Turso**: the same database and Prisma schema (`prisma/schema.prisma`).
- **Pusher**: the presence channel `NEXT_PUBLIC_PUSHER_CHANNEL` and the events `update-queue`, `queue-add`, `request-updated`, `lock-queue` and `unlock-queue`.

The Kick bot calls `/api/kick/song-request`, `/api/kick/replace` and `/api/kick/remove` with `?username=&sr=` and posts the plain-text reply in chat.

## Environment

| Variable | What it is |
| --- | --- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Turso database. `libsql://` URLs are used over HTTPS. |
| `REDIS_URL`, `QUEUE_ID` | Redis with RedisJSON, and the id of the queue document. |
| `AUTH0_SECRET`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` | Auth0 app (Twitch login). |
| `AUTH0_ISSUER_BASE_URL` or `AUTH0_DOMAIN` | Auth0 tenant. |
| `AUTH0_BASE_URL` or `APP_BASE_URL` | Public URL of this app, e.g. `https://sethdrums.com`. |
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | Pusher server credentials. |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_CHANNEL` | Pusher client settings. |
| `GOOGLE_API_KEY` | YouTube Data API, to look up new videos. |
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Twitch API, for VOD links and user lookup. |

The Auth0 routes keep their old paths (`/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`), so the Auth0 dashboard needs no changes. Signed-in users will need to sign in once more after the upgrade.

## Running it

```bash
pnpm install
pnpm dev        # needs Doppler for secrets
pnpm build && pnpm start
pnpm lint && pnpm typecheck
```

Every call to Turso, Redis, YouTube, Twitch and Pusher has a timeout, so a stuck service shows up as an error in the logs instead of a request that never finishes.

## Queue backend

The suggestion list lives in Redis by default. `queue-worker/` holds a
Cloudflare Durable Object that can replace Redis and Pusher; see
[queue-worker/README.md](queue-worker/README.md) for the env vars and the
switch-over steps.
