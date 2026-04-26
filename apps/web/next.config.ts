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
