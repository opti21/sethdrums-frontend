import { Auth0Client } from "@auth0/nextjs-auth0/server";

function issuerToDomain(issuer?: string) {
  if (!issuer) return undefined;
  return issuer.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

// Keep existing Doppler/Auth0 v3 env names working while v4 prefers
// AUTH0_DOMAIN and APP_BASE_URL.
export const auth0 = new Auth0Client({
  domain:
    process.env.AUTH0_DOMAIN ||
    issuerToDomain(process.env.AUTH0_ISSUER_BASE_URL),
  appBaseUrl: process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL,
});
