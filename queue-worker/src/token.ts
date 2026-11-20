/**
 * Short-lived tokens that let a mod panel open a socket. The frontend signs
 * them in /api/realtime/token (lib/server/realtime.ts) with
 * QUEUE_WORKER_SECRET; this checks them. Format: base64url(json).base64url(hmac).
 */
export type PanelToken = {
  sub: string;
  username: string;
  picture?: string;
  room: string;
  /** Expiry, seconds since epoch. */
  exp: number;
};

const encoder = new TextEncoder();

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function key(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "verify",
  ]);
}

export async function verifyToken(token: string | null, secret: string): Promise<PanelToken | null> {
  if (!token || !secret) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(secret), fromBase64Url(signature), encoder.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as PanelToken;
    if (!payload.sub || !payload.room || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Constant-time compare for the server-to-server bearer secret. */
export function sameSecret(given: string | null, secret: string) {
  if (!given || !secret) return false;
  const a = encoder.encode(given);
  const b = encoder.encode(secret);
  if (a.length !== b.length) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}
