import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    proxyClientMaxBodySize: "250mb",
  },
  allowedDevOrigins: ["192.168.26.216", "localhost"],
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
