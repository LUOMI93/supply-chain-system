import type { NextConfig } from "next";

function getAllowedDevOrigins() {
  const lanHosts = (process.env.LAN_HOST || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return ["localhost", "127.0.0.1", ...lanHosts];
}

const allowedDevOrigins = [
  ...getAllowedDevOrigins(),
];

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
