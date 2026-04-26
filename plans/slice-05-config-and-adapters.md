# Slice 05 — Config and adapters

**Phase:** 0 — Foundation
**Depends on:** 04
**Spec references:** [Architecture § 6.1 (Adapter pattern)](../specs/2026-04-25-studio-v1-architecture.md), [Spec § 10 (Local development)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `packages/shared/src/config.ts` parses + validates env via Zod and exports a typed `config` singleton
- All seven interfaces declared in `packages/shared/src/adapters/`: `AuthProvider`, `Storage`, `Queue`, `BillingProvider`, `AIProvider`, `EmailProvider`, `Telemetry`
- Factory `createAdapters(config)` selects implementations based on env flags (impls stub-thrown until wired in later slices)
- Unit tests verify config parsing rejects invalid combos

---

## Files

**Create:**
- `packages/shared/src/config.ts`
- `packages/shared/src/config.test.ts`
- `packages/shared/src/adapters/index.ts`
- `packages/shared/src/adapters/types.ts`
- `packages/shared/src/adapters/factory.ts`
- `packages/shared/src/index.ts` (modify)

---

## Tasks

- [ ] **Step 1 — Add zod dependency**

```bash
pnpm --filter @studio/shared add zod
```

- [ ] **Step 2 — Write failing test for config parsing**

`packages/shared/src/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseConfig } from "./config.js";

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
    });
    expect(cfg.auth.mode).toBe("dev");
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
      }),
    ).toThrow(/CLERK_PUBLISHABLE_KEY/);
  });
});
```

- [ ] **Step 3 — Run test, expect fail**

```bash
pnpm --filter @studio/shared test
```
Expected: error "Cannot find module './config.js'".

- [ ] **Step 4 — Implement `packages/shared/src/config.ts`**

```ts
import { z } from "zod";

const baseSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgres://")),
  APP_URL: z.string().url(),

  // Auth
  AUTH_MODE: z.enum(["clerk", "dev"]).default("dev"),
  DEV_USER_ID: z.string().uuid().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Storage
  STORAGE_MODE: z.enum(["s3", "minio"]).default("minio"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_APP: z.string().min(1),
  S3_BUCKET_GLOBAL: z.string().min(1),
  CLOUDFRONT_DOMAIN: z.string().optional(),

  // Queue
  QUEUE_MODE: z.enum(["sqs", "elasticmq", "inline"]).default("elasticmq"),
  SQS_ENDPOINT: z.string().url().optional(),
  SQS_REGION: z.string().min(1),
  SQS_QUEUE_GENERATIONS: z.string().min(1),
  SQS_QUEUE_CAPTIONS: z.string().min(1),
  SQS_DLQ_GENERATIONS: z.string().min(1),

  // Billing
  BILLING_MODE: z.enum(["stripe-live", "stripe-test", "stub"]).default("stub"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_FREE: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_BUSINESS: z.string().optional(),
  STRIPE_PRICE_AGENCY: z.string().optional(),

  // AI
  AI_MODE: z.enum(["real", "mock", "record"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
  RECRAFT_API_KEY: z.string().optional(),
  BFL_API_KEY: z.string().optional(),
  AWS_BEDROCK_REGION: z.string().default("us-east-1"),

  // Email
  EMAIL_MODE: z.enum(["resend", "mailpit", "console"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("studio@example.com"),

  // Observability
  OBSERVABILITY: z.enum(["sentry", "none"]).default("none"),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default("local"),
});

const refined = baseSchema.superRefine((env, ctx) => {
  if (env.AUTH_MODE === "clerk") {
    for (const k of ["CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "CLERK_WEBHOOK_SECRET"] as const) {
      if (!env[k])
        ctx.addIssue({ code: "custom", path: [k], message: `${k} required when AUTH_MODE=clerk` });
    }
  }
  if (env.AUTH_MODE === "dev" && !env.DEV_USER_ID) {
    ctx.addIssue({ code: "custom", path: ["DEV_USER_ID"], message: "required when AUTH_MODE=dev" });
  }
  if (env.STORAGE_MODE === "minio" && !env.S3_ENDPOINT) {
    ctx.addIssue({ code: "custom", path: ["S3_ENDPOINT"], message: "required when STORAGE_MODE=minio" });
  }
  if (env.QUEUE_MODE === "elasticmq" && !env.SQS_ENDPOINT) {
    ctx.addIssue({ code: "custom", path: ["SQS_ENDPOINT"], message: "required when QUEUE_MODE=elasticmq" });
  }
  if (env.BILLING_MODE !== "stub" && !env.STRIPE_SECRET_KEY) {
    ctx.addIssue({ code: "custom", path: ["STRIPE_SECRET_KEY"], message: "required when BILLING_MODE != stub" });
  }
  if (env.AI_MODE === "real") {
    if (!env.OPENAI_API_KEY && !env.REPLICATE_API_TOKEN) {
      ctx.addIssue({
        code: "custom",
        path: ["AI_MODE"],
        message: "AI_MODE=real requires at least one provider key",
      });
    }
  }
  if (env.OBSERVABILITY === "sentry" && !env.SENTRY_DSN) {
    ctx.addIssue({ code: "custom", path: ["SENTRY_DSN"], message: "required when OBSERVABILITY=sentry" });
  }
});

export type RawEnv = z.input<typeof baseSchema>;

export type Config = ReturnType<typeof shape>;

function shape(env: z.output<typeof baseSchema>) {
  return {
    appUrl: env.APP_URL,
    db: { url: env.DATABASE_URL },
    auth:
      env.AUTH_MODE === "clerk"
        ? ({
            mode: "clerk" as const,
            publishableKey: env.CLERK_PUBLISHABLE_KEY!,
            secretKey: env.CLERK_SECRET_KEY!,
            webhookSecret: env.CLERK_WEBHOOK_SECRET!,
          })
        : ({ mode: "dev" as const, devUserId: env.DEV_USER_ID! }),
    storage: {
      mode: env.STORAGE_MODE,
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      bucketApp: env.S3_BUCKET_APP,
      bucketGlobal: env.S3_BUCKET_GLOBAL,
      cloudfrontDomain: env.CLOUDFRONT_DOMAIN,
    },
    queue: {
      mode: env.QUEUE_MODE,
      endpoint: env.SQS_ENDPOINT,
      region: env.SQS_REGION,
      generationsQueue: env.SQS_QUEUE_GENERATIONS,
      captionsQueue: env.SQS_QUEUE_CAPTIONS,
      dlq: env.SQS_DLQ_GENERATIONS,
    },
    billing: {
      mode: env.BILLING_MODE,
      stripeSecretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      prices: {
        free: env.STRIPE_PRICE_FREE,
        starter: env.STRIPE_PRICE_STARTER,
        pro: env.STRIPE_PRICE_PRO,
        business: env.STRIPE_PRICE_BUSINESS,
        agency: env.STRIPE_PRICE_AGENCY,
      },
    },
    ai: {
      mode: env.AI_MODE,
      openaiKey: env.OPENAI_API_KEY,
      anthropicKey: env.ANTHROPIC_API_KEY,
      replicateToken: env.REPLICATE_API_TOKEN,
      recraftKey: env.RECRAFT_API_KEY,
      bflKey: env.BFL_API_KEY,
      bedrockRegion: env.AWS_BEDROCK_REGION,
    },
    email: {
      mode: env.EMAIL_MODE,
      resendKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
    },
    observability: {
      mode: env.OBSERVABILITY,
      sentryDsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT,
    },
  };
}

export function parseConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Config {
  const parsed = refined.parse(env);
  return shape(parsed);
}

let cached: Config | null = null;
export function loadConfig(): Config {
  if (!cached) cached = parseConfig();
  return cached;
}
```

- [ ] **Step 5 — Implement adapter interfaces**

`packages/shared/src/adapters/types.ts`:

```ts
export interface AuthIdentity {
  userId: string;
  workspaceId: string | null;
  role: "user" | "admin";
}

export interface AuthProvider {
  /** Verifies a token (Clerk JWT or dev session) and returns identity. */
  verifyRequest(headers: Headers): Promise<AuthIdentity | null>;
  /** Updates JWT to include a chosen workspace_id (Clerk) or noop (dev). */
  setActiveWorkspace(userId: string, workspaceId: string): Promise<void>;
}

export interface SignedUrl {
  url: string;
  fields?: Record<string, string>;
  expiresAt: Date;
}

export interface StorageAdapter {
  putSignedUrl(key: string, contentType: string, ttlSec?: number): Promise<SignedUrl>;
  getSignedUrl(key: string, ttlSec?: number): Promise<string>;
  putBytes(key: string, body: Uint8Array | Buffer, contentType: string): Promise<void>;
  getBytes(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  copy(srcKey: string, dstKey: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface QueueMessage<T> {
  body: T;
  receiptHandle: string;
  approximateReceiveCount: number;
}

export interface QueueAdapter {
  send<T>(queueUrl: string, body: T, opts?: { idempotencyKey?: string }): Promise<void>;
  receive<T>(queueUrl: string, max?: number): Promise<QueueMessage<T>[]>;
  delete(queueUrl: string, receiptHandle: string): Promise<void>;
}

export interface BillingProvider {
  ensureCustomer(workspaceId: string, email: string): Promise<{ customerId: string }>;
  createSubscriptionCheckout(args: {
    workspaceId: string;
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  createTopupCheckout(args: {
    workspaceId: string;
    customerId: string;
    packCode: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  customerPortalUrl(args: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  verifyWebhook(rawBody: string, signature: string): Promise<{ id: string; type: string; data: unknown }>;
}

export interface AIImageRequest {
  modelCode: string;
  prompt: string;
  negativePrompt?: string;
  references?: { s3Key: string; role: "brand_reference" | "inspiration"; weight: number }[];
  aspectRatio: string;
  width: number;
  height: number;
  seed?: number;
  safetyLevel: "default" | "strict";
}

export interface AIImageResponse {
  imageBytes: Buffer;
  modelUsedCode: string;
  upstreamCostCents: number;
  latencyMs: number;
  safetyFlags: string[];
}

export interface AITextRequest {
  modelCode: string;
  prompt: string;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AITextResponse {
  text: string;
  upstreamCostCents: number;
  latencyMs: number;
}

export interface AIProvider {
  generateImage(req: AIImageRequest): Promise<AIImageResponse>;
  generateText(req: AITextRequest): Promise<AITextResponse>;
  describeImage(s3Key: string): Promise<{ description: string }>;
  moderateText(text: string): Promise<{ flagged: boolean; categories: string[] }>;
  moderateImage(imageBytes: Buffer): Promise<{ flagged: boolean; categories: string[] }>;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<{ id: string }>;
}

export interface Telemetry {
  captureException(err: unknown, ctx?: Record<string, unknown>): void;
  metric(name: string, value: number, tags?: Record<string, string>): void;
  startSpan<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
}
```

`packages/shared/src/adapters/factory.ts`:

```ts
import { type Config } from "../config.js";
import type {
  AIProvider,
  AuthProvider,
  BillingProvider,
  EmailProvider,
  QueueAdapter,
  StorageAdapter,
  Telemetry,
} from "./types.js";

export interface Adapters {
  auth: AuthProvider;
  storage: StorageAdapter;
  queue: QueueAdapter;
  billing: BillingProvider;
  ai: AIProvider;
  email: EmailProvider;
  telemetry: Telemetry;
}

const notWiredYet = (name: string) => {
  throw new Error(`${name} adapter not wired yet — see slice plan for which slice implements it`);
};

export function createAdapters(_config: Config): Adapters {
  return {
    auth: new Proxy({}, { get: () => notWiredYet("auth") }) as AuthProvider,
    storage: new Proxy({}, { get: () => notWiredYet("storage") }) as StorageAdapter,
    queue: new Proxy({}, { get: () => notWiredYet("queue") }) as QueueAdapter,
    billing: new Proxy({}, { get: () => notWiredYet("billing") }) as BillingProvider,
    ai: new Proxy({}, { get: () => notWiredYet("ai") }) as AIProvider,
    email: new Proxy({}, { get: () => notWiredYet("email") }) as EmailProvider,
    telemetry: new Proxy({}, { get: () => notWiredYet("telemetry") }) as Telemetry,
  };
}
```

`packages/shared/src/adapters/index.ts`:

```ts
export * from "./types.js";
export * from "./factory.js";
```

- [ ] **Step 6 — Update `packages/shared/src/index.ts`**

```ts
export * from "./config.js";
export * from "./adapters/index.js";
```

- [ ] **Step 7 — Run tests, expect green**

```bash
pnpm --filter @studio/shared test
```
Expected: 3 tests pass (sanity + 2 new).

- [ ] **Step 8 — Commit**

```bash
git add -A
git commit -m "feat(shared): config schema and adapter interfaces"
```

---

## Verification

```bash
pnpm --filter @studio/shared test
pnpm typecheck
pnpm lint
```

## Commit message

```
feat(shared): config schema and adapter interfaces
```
