import { describe, expect, it } from "vitest";

import { parseConfig } from "./config";

describe("parseConfig", () => {
  it("parses dev mode env", () => {
    const cfg = parseConfig({
      AUTH_MODE: "dev",
      DEV_USER_ID: "00000000-0000-0000-0000-000000000001",
      DATABASE_URL: "postgres://x@localhost/y",
      STORAGE_MODE: "minio",
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "us-east-1",
      S3_ACCESS_KEY_ID: "k",
      S3_SECRET_ACCESS_KEY: "s",
      S3_BUCKET_APP: "app",
      S3_BUCKET_GLOBAL: "global",
      QUEUE_MODE: "elasticmq",
      SQS_ENDPOINT: "http://localhost:9324",
      SQS_REGION: "us-east-1",
      SQS_QUEUE_GENERATIONS: "g",
      SQS_QUEUE_CAPTIONS: "c",
      SQS_DLQ_GENERATIONS: "g-dlq",
      BILLING_MODE: "stub",
      AI_MODE: "mock",
      EMAIL_MODE: "mailpit",
      OBSERVABILITY: "none",
      APP_URL: "http://localhost:3000",
      EMAIL_FROM: "studio@example.com",
    });

    expect(cfg.auth.mode).toBe("dev");
    expect(cfg.features?.quickCreateV2).toBe(false);
  });

  it("enables Quick Create V2 only when explicitly configured", () => {
    const cfg = parseConfig({
      AUTH_MODE: "dev",
      DEV_USER_ID: "00000000-0000-0000-0000-000000000001",
      DATABASE_URL: "postgres://x@localhost/y",
      STORAGE_MODE: "minio",
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "us-east-1",
      S3_BUCKET_APP: "app",
      S3_BUCKET_GLOBAL: "global",
      QUEUE_MODE: "elasticmq",
      SQS_ENDPOINT: "http://localhost:9324",
      SQS_REGION: "us-east-1",
      SQS_QUEUE_GENERATIONS: "g",
      SQS_QUEUE_CAPTIONS: "c",
      SQS_DLQ_GENERATIONS: "g-dlq",
      BILLING_MODE: "stub",
      AI_MODE: "mock",
      EMAIL_MODE: "console",
      OBSERVABILITY: "none",
      APP_URL: "http://localhost:3000",
      EMAIL_FROM: "studio@example.com",
      QUICK_CREATE_V2_ENABLED: "true",
    });

    expect(cfg.features?.quickCreateV2).toBe(true);
  });

  it("supports a stable workspace rollout cohort", async () => {
    const { isQuickCreateV2Enabled } = await import("./config");
    const config = {
      features: { quickCreateV2: true, quickCreateV2RolloutPercent: 25 },
    } as Parameters<typeof isQuickCreateV2Enabled>[0];
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    expect(isQuickCreateV2Enabled(config, workspaceId)).toBe(
      isQuickCreateV2Enabled(config, workspaceId),
    );
    expect(isQuickCreateV2Enabled({ ...config, features: { ...config.features!, quickCreateV2RolloutPercent: 0 } }, workspaceId)).toBe(false);
    expect(isQuickCreateV2Enabled({ ...config, features: { ...config.features!, quickCreateV2RolloutPercent: 100 } }, workspaceId)).toBe(true);
  });

  it("rejects clerk mode without keys", () => {
    expect(() =>
      parseConfig({
        AUTH_MODE: "clerk",
        DATABASE_URL: "postgres://x@localhost/y",
        STORAGE_MODE: "s3",
        S3_REGION: "us-east-1",
        S3_BUCKET_APP: "app",
        S3_BUCKET_GLOBAL: "global",
        QUEUE_MODE: "sqs",
        SQS_REGION: "us-east-1",
        SQS_QUEUE_GENERATIONS: "g",
        SQS_QUEUE_CAPTIONS: "c",
        SQS_DLQ_GENERATIONS: "g-dlq",
        BILLING_MODE: "stripe-live",
        AI_MODE: "real",
        EMAIL_MODE: "resend",
        OBSERVABILITY: "sentry",
        APP_URL: "https://app.example.com",
        EMAIL_FROM: "studio@example.com",
      }),
    ).toThrow(/CLERK_PUBLISHABLE_KEY/);
  });
});
