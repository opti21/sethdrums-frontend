import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/server/auth";

// Only the Auth0 login, callback, logout and profile routes go through here.
// Every other API route checks the session itself, so nothing else waits on
// this step.
export async function proxy(request: NextRequest) {
  return auth0.middleware(request);
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
