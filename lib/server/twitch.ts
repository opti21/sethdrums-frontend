import "server-only";
import { prisma } from "./prisma";

const TWITCH_TIMEOUT_MS = 8_000;

async function fetchAppToken() {
  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", process.env.TWITCH_CLIENT_ID ?? "");
  url.searchParams.set("client_secret", process.env.TWITCH_CLIENT_SECRET ?? "");
  url.searchParams.set("grant_type", "client_credentials");
  const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(TWITCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  await prisma.twitchCreds.upsert({
    where: { id: 1 },
    create: { id: 1, access_token: data.access_token, expires_in: data.expires_in },
    update: { access_token: data.access_token, expires_in: data.expires_in },
  });
  return data.access_token;
}

async function storedToken() {
  const row = await prisma.twitchCreds.findUnique({ where: { id: 1 } });
  return row?.access_token ?? fetchAppToken();
}

/** GET a Twitch Helix endpoint, refreshing the app token once on a 401. */
export async function helix<T>(path: string): Promise<T> {
  const call = (token: string) =>
    fetch(`https://api.twitch.tv/helix${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-ID": process.env.TWITCH_CLIENT_ID ?? "",
      },
      signal: AbortSignal.timeout(TWITCH_TIMEOUT_MS),
    });

  let res = await call(await storedToken());
  if (res.status === 401) {
    res = await call(await fetchAppToken());
  }
  if (!res.ok) {
    throw new Error(`Twitch ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}
