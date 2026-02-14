/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@cultivated-crm/db", "@cultivated-crm/shared"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
