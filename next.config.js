/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/merch",
        destination: "https://sethdrums-shop.fourthwall.com",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
