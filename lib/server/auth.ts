import "server-only";
import { Auth0Client, DEFAULT_ID_TOKEN_CLAIMS } from "@auth0/nextjs-auth0/server";
import { prisma } from "./prisma";
import { helix } from "./twitch";

// Seth's Twitch account id. Seth gets the Seth view on top of mod access.
export const SETH_TWITCH_ID = "147155277";

function auth0Domain() {
  if (process.env.AUTH0_DOMAIN) {
    return process.env.AUTH0_DOMAIN;
  }
  // Older env name kept so the Render settings don't have to change.
  const issuer = process.env.AUTH0_ISSUER_BASE_URL;
  return issuer ? new URL(issuer).host : undefined;
}

// Render PR previews copy the prod env vars, so the prod URL would send the
// login callback to prod. Previews use their own URL instead.
function appBaseUrl() {
  if (process.env.IS_PULL_REQUEST === "true" && process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  return process.env.APP_BASE_URL ?? process.env.AUTH0_BASE_URL;
}

// Keep the default claims plus Twitch's username, which the SDK would
// otherwise drop. The whole app uses it as the mod's display name.
const KEEP_CLAIMS = [...DEFAULT_ID_TOKEN_CLAIMS, "preferred_username"];

export const auth0 = new Auth0Client({
  domain: auth0Domain(),
  appBaseUrl: appBaseUrl(),
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  // Same paths as before, so the Auth0 callback URL stays the same.
  async beforeSessionSaved(session) {
    const user = Object.fromEntries(Object.entries(session.user).filter(([key]) => KEEP_CLAIMS.includes(key)));
    return { ...session, user: user as typeof session.user };
  },
  routes: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    callback: "/api/auth/callback",
    profile: "/api/auth/me",
    accessToken: "/api/auth/access-token",
  },
  authorizationParameters: {
    scope: "openid profile",
  },
});

export type CurrentUser = {
  twitchId: string;
  username: string;
  picture?: string;
};

/** The signed-in Twitch user, or null. Auth0 subs look like `oauth2|twitch|<id>`. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth0.getSession();
  if (!session) {
    return null;
  }
  const sub = String(session.user.sub ?? "");
  const username = String(session.user.preferred_username || session.user.nickname || session.user.name || "");

  if (process.env.NODE_ENV === "development" && sub.startsWith("auth0|")) {
    return { twitchId: "test_user_id", username: "test_user", picture: session.user.picture };
  }

  const twitchId = sub.split("|")[2] ?? "";
  return {
    twitchId,
    // Sessions from before the username was kept have none; look it up.
    username: username || (await twitchLogin(twitchId)),
    picture: session.user.picture,
  };
}

// Every page view and every panel poll checks mod status, so remember the
// answer briefly instead of asking the database each time. Adding or removing
// a mod takes effect within a minute.
const MOD_CACHE_MS = 60_000;
const modCache = new Map<string, { mod: boolean; until: number }>();

const loginCache = new Map<string, string>();

/** Twitch login for a user id, cached. Empty string if Twitch can't say. */
export async function twitchLogin(twitchId: string) {
  if (!twitchId) return "";
  const cached = loginCache.get(twitchId);
  if (cached) return cached;
  try {
    const { data } = await helix<{ data: { login: string }[] }>(`/users?id=${encodeURIComponent(twitchId)}`);
    const login = data[0]?.login ?? "";
    if (login) loginCache.set(twitchId, login);
    return login;
  } catch (error) {
    console.error("[auth] Twitch username lookup failed", error);
    return "";
  }
}

export async function isMod(twitchId: string) {
  if (!twitchId) {
    return false;
  }
  const cached = modCache.get(twitchId);
  if (cached && cached.until > Date.now()) {
    return cached.mod;
  }
  const mod = Boolean(await prisma.mod.findFirst({ where: { twitch_id: twitchId }, select: { id: true } }));
  modCache.set(twitchId, { mod, until: Date.now() + MOD_CACHE_MS });
  return mod;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new HttpError(401, "Not signed in");
  }
  return user;
}

export async function requireMod() {
  const user = await requireUser();
  if (!(await isMod(user.twitchId))) {
    throw new HttpError(403, "Not a mod");
  }
  return user;
}
