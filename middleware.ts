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
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
