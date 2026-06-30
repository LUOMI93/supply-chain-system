import type { NextConfig } from "next";

const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  "192.168.2.16",
  process.env.LAN_HOST,
].filter((origin): origin is string => Boolean(origin));

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    proxyClientMaxBodySize: "250mb",
  },
  allowedDevOrigins,
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "next/server.js": "next/server",
      "next/navigation.js": "next/navigation",
      "next/headers.js": "next/headers",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
