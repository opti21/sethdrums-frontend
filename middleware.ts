import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

const hasAuthConfig = Boolean(
  (process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL) &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_SECRET
);

export async function middleware(request: NextRequest) {
  if (!hasAuthConfig) {
    return NextResponse.next();
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Skip /api. Auth0 v4 still serves /auth/* from this middleware.
     * Next.js 15 does not wait to put the request body back after
     * middleware, so API routes that read a body can stall. API handlers
     * read the session cookie themselves.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
