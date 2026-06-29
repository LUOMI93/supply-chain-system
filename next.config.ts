import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许本地开发时上传的图片
  images: {
    unoptimized: true,
  },
  // Next.js 内部代理会缓存请求体，默认 10MB 限制
  // 配合导入 API 的 200MB 上限，设置为 250MB
  experimental: {
    proxyClientMaxBodySize: "250mb",
  },
  // 允许通过 IP 访问时 HMR 正常连接（解决跨域阻断导致登录页面 JS 加载不完整）
  allowedDevOrigins: ["192.168.2.144", "localhost"],
  // Turbopack 模块别名 — 修复 next-auth v5 兼容性问题
  turbopack: {
    resolveAlias: {
      "next/server.js": "next/server",
      "next/navigation.js": "next/navigation",
      "next/headers.js": "next/headers",
    },
  },
  // 安全头
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
