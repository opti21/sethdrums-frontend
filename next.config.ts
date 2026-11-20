import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "sameorigin" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Tabs left open across a deploy otherwise keep asking the new server for
  // the old build's files, which can leave a page stuck loading. With this,
  // Next notices the new deploy and does a full page load instead.
  deploymentId: process.env.RENDER_GIT_COMMIT,
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql", "redis", "pusher"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "static-cdn.jtvnw.net" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/merch", destination: "https://sethdrums-shop.fourthwall.com/", permanent: false },
    ];
  },
};

export default nextConfig;
