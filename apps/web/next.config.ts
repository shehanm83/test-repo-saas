import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: false,
  },
  // Keep heavy server-only deps out of the dev webpack graph. They still
  // resolve via Node at runtime when actually imported (Sentry/OTEL only when
  // SENTRY_DSN is set; AWS SDK clients only when their adapters are used).
  serverExternalPackages: [
    "@sentry/nextjs",
    "@sentry/node",
    "@sentry/core",
    "@opentelemetry/api",
    "@opentelemetry/instrumentation",
    "@opentelemetry/sdk-trace-base",
    "@opentelemetry/sdk-trace-node",
    "@aws-sdk/client-cloudwatch",
    "@aws-sdk/client-s3",
    "@aws-sdk/client-sqs",
    "@aws-sdk/s3-request-presigner",
    "drizzle-orm",
    "postgres",
    "puppeteer-core",
    "satori",
    "@resvg/resvg-js",
    "sharp",
  ],
  transpilePackages: [
    "@layertone/api",
    "@layertone/auth",
    "@layertone/billing",
    "@layertone/db",
    "@layertone/gateway",
    "@layertone/observability",
    "@layertone/queue",
    "@layertone/renderer",
    "@layertone/shared",
    "@layertone/storage",
    "@layertone/worker",
  ],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals)
          ? config.externals
          : [config.externals].filter(Boolean)),
        {
          "@resvg/resvg-js": "commonjs @resvg/resvg-js",
          "@resvg/resvg-js-linux-x64-gnu": "commonjs @resvg/resvg-js-linux-x64-gnu",
          "@resvg/resvg-js-linux-x64-musl": "commonjs @resvg/resvg-js-linux-x64-musl",
        },
      ];
    }

    return config;
  },
};

export default nextConfig;
