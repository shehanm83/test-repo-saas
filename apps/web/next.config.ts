import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    webpackBuildWorker: false,
  },
  transpilePackages: [
    "@studio/api",
    "@studio/auth",
    "@studio/billing",
    "@studio/db",
    "@studio/gateway",
    "@studio/observability",
    "@studio/queue",
    "@studio/renderer",
    "@studio/shared",
    "@studio/storage",
  ],
};

export default nextConfig;
