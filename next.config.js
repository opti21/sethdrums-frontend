const { withAxiom } = require("next-axiom");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

module.exports = withAxiom({ nextConfig });
