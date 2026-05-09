import { z } from "zod";

const baseSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgres://")),
  APP_URL: z.string().url(),

  AUTH_MODE: z.enum(["clerk", "dev"]).default("dev"),
  DEV_USER_ID: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  STORAGE_MODE: z.enum(["s3", "minio"]).default("minio"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_APP: z.string().min(1),
  S3_BUCKET_GLOBAL: z.string().min(1),
  CLOUDFRONT_DOMAIN: z.string().optional(),

  QUEUE_MODE: z.enum(["sqs", "elasticmq", "inline"]).default("elasticmq"),
  SQS_ENDPOINT: z.string().url().optional(),
  SQS_REGION: z.string().min(1),
  SQS_QUEUE_GENERATIONS: z.string().min(1),
  SQS_QUEUE_CAPTIONS: z.string().min(1),
  SQS_DLQ_GENERATIONS: z.string().min(1),

  BILLING_MODE: z.enum(["stripe-live", "stripe-test", "stub"]).default("stub"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_FREE: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_BUSINESS: z.string().optional(),
  STRIPE_PRICE_AGENCY: z.string().optional(),
  STRIPE_PRICE_TOPUP_200: z.string().optional(),
  STRIPE_PRICE_TOPUP_750: z.string().optional(),
  STRIPE_PRICE_TOPUP_2500: z.string().optional(),

  AI_MODE: z.enum(["real", "mock", "record"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-2"),
  OPENAI_TEXT_MODEL: z.string().default("gpt-5.4-mini"),
  ANTHROPIC_API_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
  RECRAFT_API_KEY: z.string().optional(),
  BFL_API_KEY: z.string().optional(),
  GOOGLE_GENAI_API_KEY: z.string().optional(),
  AWS_BEDROCK_REGION: z.string().default("us-east-1"),

  EMAIL_MODE: z.enum(["resend", "mailpit", "console"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("studio@example.com"),
  EMAIL_SMTP_HOST: z.string().default("localhost"),
  EMAIL_SMTP_PORT: z.coerce.number().int().positive().default(1025),

  OBSERVABILITY: z.enum(["sentry", "none"]).default("none"),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default("local"),
});

const refinedSchema = baseSchema.superRefine((env, ctx) => {
  if (env.AUTH_MODE === "clerk") {
    for (const key of [
      "CLERK_PUBLISHABLE_KEY",
      "CLERK_SECRET_KEY",
    ] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} required when AUTH_MODE=clerk`,
        });
      }
    }
    // CLERK_WEBHOOK_SECRET is optional. The webhook route (/api/webhooks/clerk)
    // refuses to process events when it is unset — see ClerkWebhookHandler.
    // Local environments without a public URL/tunnel can leave it empty.
  }

  if (env.AUTH_MODE === "dev" && !env.DEV_USER_ID) {
    ctx.addIssue({
      code: "custom",
      path: ["DEV_USER_ID"],
      message: "DEV_USER_ID required when AUTH_MODE=dev",
    });
  }

  if (env.STORAGE_MODE === "minio" && !env.S3_ENDPOINT) {
    ctx.addIssue({
      code: "custom",
      path: ["S3_ENDPOINT"],
      message: "S3_ENDPOINT required when STORAGE_MODE=minio",
    });
  }

  if (env.QUEUE_MODE === "elasticmq" && !env.SQS_ENDPOINT) {
    ctx.addIssue({
      code: "custom",
      path: ["SQS_ENDPOINT"],
      message: "SQS_ENDPOINT required when QUEUE_MODE=elasticmq",
    });
  }

  if (env.BILLING_MODE !== "stub") {
    if (!env.STRIPE_SECRET_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["STRIPE_SECRET_KEY"],
        message: "STRIPE_SECRET_KEY required when BILLING_MODE != stub",
      });
    }
    if (!env.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["STRIPE_WEBHOOK_SECRET"],
        message:
          "STRIPE_WEBHOOK_SECRET required when BILLING_MODE != stub. Without it, Stripe webhook events (invoice.paid, checkout.session.completed) cannot be verified, so paid checkouts will never grant credits. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the printed whsec_… value, or set BILLING_MODE=stub to disable Stripe entirely.",
      });
    }
  }

  if (env.AI_MODE === "real" && !env.OPENAI_API_KEY && !env.REPLICATE_API_TOKEN) {
    ctx.addIssue({
      code: "custom",
      path: ["AI_MODE"],
      message: "AI_MODE=real requires at least one provider key",
    });
  }

  if (env.EMAIL_MODE === "resend" && !env.RESEND_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["RESEND_API_KEY"],
      message: "RESEND_API_KEY required when EMAIL_MODE=resend",
    });
  }

  if (env.OBSERVABILITY === "sentry" && !env.SENTRY_DSN) {
    ctx.addIssue({
      code: "custom",
      path: ["SENTRY_DSN"],
      message: "SENTRY_DSN required when OBSERVABILITY=sentry",
    });
  }
});

export type RawEnv = z.input<typeof baseSchema>;

function shape(env: z.output<typeof baseSchema>) {
  return {
    appUrl: env.APP_URL,
    db: { url: env.DATABASE_URL },
    auth:
      env.AUTH_MODE === "clerk"
        ? {
            mode: "clerk" as const,
            publishableKey: env.CLERK_PUBLISHABLE_KEY!,
            secretKey: env.CLERK_SECRET_KEY!,
            webhookSecret: env.CLERK_WEBHOOK_SECRET,
          }
        : {
            mode: "dev" as const,
            devUserId: env.DEV_USER_ID!,
          },
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
      topupPrices: {
        p200: env.STRIPE_PRICE_TOPUP_200,
        p750: env.STRIPE_PRICE_TOPUP_750,
        p2500: env.STRIPE_PRICE_TOPUP_2500,
      },
    },
    ai: {
      mode: env.AI_MODE,
      openaiKey: env.OPENAI_API_KEY,
      openaiImageModel: env.OPENAI_IMAGE_MODEL,
      openaiTextModel: env.OPENAI_TEXT_MODEL,
      anthropicKey: env.ANTHROPIC_API_KEY,
      replicateToken: env.REPLICATE_API_TOKEN,
      recraftKey: env.RECRAFT_API_KEY,
      bflKey: env.BFL_API_KEY,
      googleGenaiKey: env.GOOGLE_GENAI_API_KEY,
      bedrockRegion: env.AWS_BEDROCK_REGION,
    },
    email: {
      mode: env.EMAIL_MODE,
      resendKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
      smtpHost: env.EMAIL_SMTP_HOST,
      smtpPort: env.EMAIL_SMTP_PORT,
    },
    observability: {
      mode: env.OBSERVABILITY,
      sentryDsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT,
    },
  };
}

export type Config = ReturnType<typeof shape>;

export function parseConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Config {
  return shape(refinedSchema.parse(env));
}

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = parseConfig();
  }

  return cachedConfig;
}

export const config = new Proxy({} as Config, {
  get(_target, property) {
    return loadConfig()[property as keyof Config];
  },
});
