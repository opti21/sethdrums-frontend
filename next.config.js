const headers = require("./headers");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

module.exports = nextConfig;
