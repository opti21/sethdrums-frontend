import { Auth0Client } from "@auth0/nextjs-auth0/server";

function issuerToDomain(issuer?: string) {
  if (!issuer) return undefined;
  return issuer.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function normalizeAppBaseUrl(value?: string) {
  if (!value) return undefined;
  const urls = value
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (urls.length === 0) return undefined;
  return urls.length === 1 ? urls[0] : urls;
}

// Keep existing Doppler/Auth0 v3 env names working while v4 prefers
// AUTH0_DOMAIN and APP_BASE_URL. v4's /auth/profile returns 401 when logged
// out, and useUser() retries that forever. 204 matches the old SDK and stops
// the retry storm after a base URL change invalidates existing sessions.
export const auth0 = new Auth0Client({
  domain:
    issuerToDomain(process.env.AUTH0_DOMAIN) ||
    issuerToDomain(process.env.AUTH0_ISSUER_BASE_URL),
  appBaseUrl: normalizeAppBaseUrl(
    process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL
  ),
  noContentProfileResponseWhenUnauthenticated: true,
});
