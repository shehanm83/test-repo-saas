# Architecture — Studio v1

**Status:** Draft for review
**Date:** 2026-04-25
**Owner:** Shehan Fernando
**Quality bar:** **Production v1 — every component below ships as production-grade code.** "Cost-conscious" picks are **drop-in replacements** for premium AWS-native primitives, not stubs. Each upgrade trigger in § 9 swaps an implementation behind an unchanged interface. Testing breadth is intentionally trimmed (per project decision); feature code is full-fidelity.
**Companion docs:**
- `2026-04-25-studio-v1-prd.md`
- `2026-04-25-studio-v1-spec.md`
- `2026-04-25-studio-v1-ui-prompts.md`

---

## 1. Deployment target

**AWS, single account, single region (us-east-1 default; eu-west-1 secondary if EU residency demanded).** Cost-conscious topology in v1, with documented upgrade triggers to premium AWS-native primitives.

## 2. Component map

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼  (HTTPS, JWT)
┌─────────────────────────────────────────────────────────────────────────┐
│  CloudFront (Edge cache, static + API)                                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router) on AWS Lambda via OpenNext                     │
│  ├─ Pages (RSC)        ├─ API routes              ├─ Webhook handlers   │
└──────────┬──────────────────────┬───────────────────────┬───────────────┘
           │                      │                       │
           │                      │                       ▼
           │                      │              ┌──────────────────┐
           │                      │              │ Stripe / Clerk   │
           │                      │              │ webhook ingestion│
           │                      │              └──────────────────┘
           │                      │
           ▼                      ▼
┌────────────────────┐    ┌─────────────────────────────────────────┐
│  Neon Postgres     │    │  SQS (generation jobs)                  │
│  (pgvector)        │    │  - main queue                           │
│  RLS-enforced      │    │  - DLQ (3 attempts)                     │
└────────────────────┘    └────────────────────┬────────────────────┘
           ▲                                   │
           │                                   ▼
           │                       ┌────────────────────────┐
           │                       │  Worker Lambda          │
           │                       │  (generation pipeline)  │
           │                       └──────┬──────────────────┘
           │                              │
           │            ┌─────────────────┼──────────────────┐
           │            ▼                 ▼                  ▼
           │   ┌────────────────┐ ┌──────────────┐ ┌──────────────────┐
           │   │ AI Gateway     │ │ Template     │ │ S3 (assets +     │
           │   │ Lambda         │ │ Renderer     │ │ generation       │
           │   │ (model routing)│ │ Lambda       │ │ outputs)         │
           │   └────────────────┘ │ Satori+Resvg │ └──────────────────┘
           │                      │ + Puppeteer  │
           │                      │ fallback     │
           │                      └──────────────┘
           │                              │
           └──────────────────────────────┘
                  (writes commit/release entries)

External providers (called by AI Gateway):
   ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐
   │ OpenAI   │ │ Replicate    │ │ Black Forest │ │ Bedrock         │
   │ gpt-     │ │ Flux 1.1 Pro │ │ Labs (BFL)   │ │ Stable Diff 3.5 │
   │ image-1  │ │ Recraft V3   │ │ Flux Pro     │ │ Nova Canvas     │
   └──────────┘ └──────────────┘ └──────────────┘ └─────────────────┘

Auth: Clerk (managed). Email: Resend. Errors: Sentry. Logs: CloudWatch.
```

## 3. Service inventory

### 3.1 Web tier

- **Runtime:** Next.js 15 (App Router) on AWS Lambda via [OpenNext](https://opennext.js.org/) or AWS Amplify Hosting Gen 2 (decide during impl; both viable).
- **Static + cache:** CloudFront in front, with cache rules: HTML (no-store for app shell), Static (`/_next/static/*`) immutable 1y, API (`/api/*`) no-store.
- **Cold start mitigation:** provisioned concurrency 1–2 on hot routes (`/api/generations`, `/api/captions`) when traffic justifies. Day-1 = no provisioned concurrency.

### 3.2 Worker tier

- **Generation worker Lambda** — SQS-triggered. Memory 1024MB. Timeout 60s. Concurrency 10 (raise per traffic).
- **Template Renderer Lambda** — invoked synchronously from worker. Memory 512MB. Timeout 10s. Pure stateless.
- **Browser-render fallback Lambda** — Puppeteer (chromium-aws-lambda layer). Memory 1024MB. Timeout 30s. Used only when `templates.requires_browser_render = true`.
- **AI Gateway Lambda** — abstracts upstream providers. Stateless. Memory 512MB. Timeout 60s.

Workers communicate with the database using a separate Lambda execution role + dedicated `app_worker` DB role (RLS-enforced, can write to ledger).

### 3.3 Data

- **Neon Serverless Postgres** with `pgvector` extension. Branch: `main` (prod), `staging`, `preview-*` (per-PR ephemeral).
- **Connection pooling** via Neon's built-in PgBouncer-compatible pooler. Lambda → pooler endpoint.
- **Schema migrations** via Drizzle Kit. Migration files in `db/migrations/`. Applied via CI deployment job to prod.

### 3.4 Storage

- **S3 buckets:**
  - `saasimg-app-prod-assets` — tenant-scoped (`workspaces/{wid}/...`). Default encryption (SSE-S3). Versioning on.
  - `saasimg-app-prod-global` — admin-managed (templates previews, mood previews, stock library). Public-read via CloudFront for `stock/*`.
- **CloudFront distributions:**
  - One distribution fronts the app (Lambda origin + S3 origin for static).
  - One fronts the assets bucket for serving generated outputs (signed URLs minted by API).

### 3.5 Queue & orchestration (v1)

- **SQS standard queue + DLQ.** No Step Functions in v1. Generation pipeline state lives in `generations` + `generation_variants` rows. Fan-in (last variant marks generation complete) implemented via Postgres `UPDATE ... WHERE NOT EXISTS` clause.
- **Why no Step Functions:** linear fan-out/fan-in pattern with clear DB-level state. Step Functions adds per-transition cost without solving a problem we have at v1 scale. Upgrade trigger: pipeline grows branches (conditional caption, conditional translation, conditional human review) — at that point, migrate orchestration logic to Step Functions.

### 3.6 Auth

- **Clerk** (cloud-hosted). Free up to 10k MAU.
- Webhook → app for `user.created`, `user.updated`, `user.deleted`, `organization.*`.
- JWT validation in Lambda middleware via Clerk's JWKS endpoint (cached locally with TTL).
- Workspaces map to Clerk Organizations for multi-seat plans; personal workspaces are personal Clerk users with no org binding.

### 3.7 Billing

- **Stripe Billing** with Stripe Tax enabled.
- Products: one Product per pricing tier (`free`, `starter`, `pro`, `business`, `agency`), one-time Products for top-up packs.
- Customer Credit Grants used for monthly grant tracking on Stripe side; the app's `credit_ledger_entries` is the **product source of truth** for whether a generation can run. Stripe is for invoicing/reconciliation.
- Webhooks → `/api/webhooks/stripe`. Signed verification mandatory.

### 3.8 Email

- **Resend.** Domain configured: `mail.<saas-domain>`. SPF, DKIM, DMARC set up.
- Templates: welcome, invite, payment-failed, top-up-receipt, generation-completed (optional digest).

### 3.9 Observability (v1)

- **Sentry free tier** for errors (Next.js + Lambda integration). DSN per environment.
- **CloudWatch** default Lambda logs + custom metrics (generation duration, queue depth, AI provider latency).
- **OTEL placeholder hooks** in code (`instrumentation.ts`, span tags around critical sections) but no collector wired. Upgrade trigger: when Sentry + CloudWatch metrics no longer answer "why is p95 latency up?" — wire ADOT collector to CloudWatch + downstream Grafana.

### 3.10 Secrets

- **AWS Parameter Store SecureString** in prod. Free at our scale.
- Lambda execution roles get scoped IAM policies to read only the parameters they need (`/saasimg/<env>/*` prefix).
- Local: `.env.local` (gitignored) with `.env.example` checked in.

## 4. AI gateway design

### 4.1 Responsibilities

- Single internal interface for image generation regardless of upstream provider.
- Routing by `model_code` (provider:model:variant): `flux-1.1-pro`, `gpt-image-1`, `recraft-v3`, `bedrock-sd35`.
- Per-provider auth, rate limit, error normalization.
- Retry + fallback policy (one retry same provider → fallback to `bedrock-sd35`).
- Cost normalization: returns actual upstream cost in USD cents alongside the image, used for ledger commit.
- Pluggable: adding a new provider = implement `ImageProvider` interface + register.

### 4.2 Interface

```ts
type ReferenceRole = "brand_reference" | "inspiration";

interface ImageReference {
  s3Key: string;
  role: ReferenceRole;     // gateway uses this to apply per-role weighting + provider routing
  weight: number;          // 0..1; brand=0.4 default, inspiration=0.3|0.6|0.9 by influence
}

interface GenerateImageRequest {
  modelCode: ModelCode;
  prompt: string;
  negativePrompt?: string;
  references?: ImageReference[];
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1" | "2:3";
  width: number;           // exact pixel target (from output_target)
  height: number;
  seed?: number;
  safetyLevel: "default" | "strict";
}

interface GenerateImageResponse {
  imageBytes: Buffer;
  modelUsedCode: ModelCode;       // may differ from requested if fallback or i2i routing kicked in
  upstreamCostCents: number;
  latencyMs: number;
  safetyFlags: string[];
}
```

### 4.3 Provider strategies

**Image generation:**

| Model code | Provider | Image-to-image support | When chosen |
|---|---|---|---|
| `flux-1.1-pro` | Replicate or BFL direct | ✅ (img2img + reference image params) | Default. Photoreal-per-dollar. |
| `gpt-image-1` | OpenAI direct | ✅ (native multi-image input) | Premium tier (Pro+ user toggle). Strong prompt adherence + safety. Best when both brand references and inspiration image are present. |
| `recraft-v3` | Recraft API | ✅ (style reference) | Templates with `preferred_model='recraft-v3'`. Illustrative / poster / typographic styles. |
| `bedrock-sd35` / `nova-canvas` | AWS Bedrock | Limited | Fallback only when primary fails twice. Reduced credit cost. |

**Image-to-image routing rule.** When the worker passes an `inspiration` reference and the requested `modelCode` does not support image-to-image at the requested fidelity, the gateway:
1. **Promotion path:** if a higher-tier model in the same routing class supports i2i and the user is entitled (tier check), route to that model and return its `modelUsedCode`. Worker uses returned `modelUsedCode` for `price_book_entries.find()` to compute actual cost.
2. **Vision-fallback path:** otherwise, the gateway converts the inspiration image into a descriptive paragraph via a vision model (Claude Sonnet 4.6 vision), prepends that description to the prompt with a stylistic-cue tag (`Style cues from reference: <description>`), and proceeds text-only. Brand references are handled the same way for providers without multi-image support.

The exact promotion/fallback table lives in `apps/gateway/src/routing.ts`. It's a code-level concern, deployable in code changes, not DB-driven.

**Caption generation (separate task):**

- **Anthropic Claude Haiku** — via Anthropic API direct. Cheap, fast, suitable for short rich-text outputs (1–5 credits). Routed through the same gateway via a parallel `TextProvider` interface.

**Vision (inspiration-image-to-text fallback, inspiration captioning):**

- **Anthropic Claude Sonnet 4.6 vision** — via Anthropic API direct. Used internally by the gateway for the vision-fallback path described above. Internal cost is rolled into the inspiration-image surcharge.

### 4.4 Safety pipeline (gateway-level)

1. **Pre-flight moderation** — brief sent to OpenAI Moderation API (or Bedrock Guardrails). On block, return `safety_blocked` error before any upstream call.
2. **Upstream call** with provider-specific safety levels enabled where supported.
3. **Post-flight moderation** (optional, default-on for Pro+ tiers) — output image classified; flags returned to caller. Caller decides whether to block.

## 5. Template renderer design

### 5.1 Pipeline

```
{template, background, brand, mood, slots, output_target: {aspect_ratio, width, height}}
        │
        ▼
   Load template JSX from `templates.jsx_source`
        │
        ▼
   Load brand fonts from S3 (cached in /tmp across Lambda warm starts)
        │
        ▼
   Compose React tree at exact (width, height):
     <Background image={backgroundUrl} />
     <Decorations from={mood.decoration_tags} stockAssets={...} />
     <BrandLogo svg={brand.logo} placement={template.slots.logo} />
     <Headline font={brand.fonts.heading} color={brand.palette.primary} text={slots.headline} />
     <Subhead font={brand.fonts.body} text={slots.subhead} />
     <CTA font={brand.fonts.body} bg={brand.palette.accent} text={slots.cta} />
        │
        ▼
   Satori → SVG → Resvg → PNG (exact pixel dimensions per output_target) → S3
```

### 5.2 Why Satori + Resvg

- Server-side, no headless browser → fast (~200–500ms).
- Brand-font-perfect (loads font binaries directly).
- JSX-based templates → readable, maintainable, type-safe.
- Used by Vercel OG; well-supported.

### 5.3 Browser-render fallback (Puppeteer)

- Used only when a template needs CSS features Resvg doesn't fully support (e.g., complex filter chains, SVG masks beyond Resvg's subset, advanced typography features).
- Marked via `templates.requires_browser_render = true`.
- 5–10x slower than Satori path; reserved for edge cases.

### 5.4 Template authoring contract

A template is:
- A JSX function component with a typed `props` interface.
- Declares its `slots` schema (jsonb in DB) — what fields the renderer will populate.
- Declares its `text_safe_zones` (jsonb) — used by AI Gateway prompt construction to advise model on negative-space placement.
- Declares `preferred_model` and `supported_aspect_ratios`.
- Stored as source string in `templates.jsx_source`. Renderer Lambda has a server-only sandbox (`new Function(...)`) to compile + render. Templates are admin-authored only — never user-supplied — so the trust boundary is acceptable.

## 6. Local development

### 6.1 Adapter pattern

All cloud dependencies sit behind interfaces, picked at boot from env flags:

| Interface | Prod impl | Dev impl |
|---|---|---|
| `AuthProvider` | Clerk | Dev bypass (injects `DEV_USER_ID` into request context) |
| `Queue` | SQS via AWS SDK | ElasticMQ (same SDK, different endpoint) OR inline (calls worker directly) |
| `Storage` | S3 via AWS SDK | MinIO (same SDK, `S3_ENDPOINT` overridden) |
| `BillingProvider` | Stripe live | Stripe test mode OR stub (mutates ledger directly via dev-only API) |
| `AIProvider` | Real APIs | Mock (canned PNG by prompt hash) OR record (capture real for replay) |
| `EmailProvider` | Resend | Mailpit (real SMTP, web inbox) OR console |
| `Telemetry` | Sentry | None |
| `Secrets` | AWS Parameter Store | `.env.local` |

### 6.2 Docker Compose stack

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: saasimg
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio12345
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]

  elasticmq:
    image: softwaremill/elasticmq-native
    ports: ["9324:9324"]

  mailpit:
    image: axllent/mailpit
    ports: ["1025:1025", "8025:8025"]

volumes: { pgdata: {}, miniodata: {} }
```

### 6.3 Boot

```
make dev:
  docker compose up -d
  pnpm db:migrate
  pnpm db:seed
  pnpm minio:bootstrap
  pnpm dev:all   # next dev + worker:dev + tsc:watch (concurrently)
```

After boot: `http://localhost:3000`, auto-signed-in as dev user, seeded workspace + brand + sample mood + sample templates.

## 7. CI/CD

### 7.1 Branches

- `main` → production
- `staging` → staging environment
- feature branches → preview environments (Neon branch + ephemeral Lambda deployment)

### 7.2 Pipeline (GitHub Actions)

```
on: pull_request
jobs:
  - lint (eslint + prettier)
  - typecheck (tsc --noEmit)
  - unit (vitest)
  - integration (vitest, against Docker Compose stack, AI_MODE=mock)

on: push to main
jobs:
  - all of the above
  - e2e (Playwright against deployed staging)
  - deploy to staging
  - manual approval gate
  - deploy to prod
```

### 7.3 Migrations

- Drizzle migrations applied as part of deploy job (before Lambda update).
- **No automated migration safety testing** in v1 (per decision). Manual review of migration SQL is part of PR review checklist.
- Rollback: forward-only migrations preferred; for breaking changes, write paired forward migrations.

## 8. Cost envelope (excluding AI inference)

| Stage | Monthly infra cost (rough) |
|---|---|
| Pre-launch / staging | $30–50 |
| 50 paying customers (~$1.5k MRR) | $100–150 |
| 500 paying customers (~$15k MRR) | $500–800 |

AI inference is **pass-through to credit pricing** — every credit purchased should cover its inference cost plus margin. Margin tuned via `price_book_entries`.

## 9. Upgrade triggers (when to leave cost-conscious mode)

| Component | Trigger | Upgrade |
|---|---|---|
| Lambda web tier | Sustained traffic where Lambda cost > Fargate equivalent | Migrate Next.js to Fargate via SST or Amplify Hosting Gen 2 |
| Worker Lambda | Generation queue depth sustains > 50 with cold-start delays | Always-on Fargate worker pool, keep Lambda for spillover |
| Neon Postgres | Active hours exceed Neon Pro plan cost-effectiveness, or compliance requires single-tenant | RDS Aurora PostgreSQL Multi-AZ |
| SQS-only orchestration | Pipeline grows conditional branches | Step Functions for pipeline workflow, SQS still for simple queues |
| Sentry + CloudWatch | "Why is p95 high?" no longer answerable | Wire ADOT (OpenTelemetry collector) → CloudWatch + Grafana |
| Clerk | MAU breaks Clerk pricing economics | Migrate to Cognito with custom org/role layer |
| Long-poll status | Active generation count makes polling load expensive | Postgres LISTEN/NOTIFY → SSE streaming response |

Each upgrade is a **drop-in replacement** behind the existing interface — no application rewrite required.

## 10. Cross-cloud portability seams

The product is AWS-native by intent, but three abstraction seams keep migration cheap if needed later:

- **Storage** behind `Storage` interface (already adapter-pattern for dev/prod).
- **Queue** behind `Queue` interface.
- **AI providers** behind `AIProvider` interface — already vendor-agnostic.

Auth (Clerk) and DB (Postgres) are inherently portable. Stripe is non-negotiable across clouds.

If a customer ever requires Azure or GCP deployment, the lift is replacing S3 → Blob/GCS, SQS → Service Bus/Pub-Sub, Lambda → Container Apps/Cloud Run. All adapter swaps; the product code does not change.

## 11. Open implementation questions

- OpenNext vs AWS Amplify Hosting Gen 2 for Next.js Lambda deployment — bench during impl.
- Drizzle vs Prisma — leaning Drizzle for type safety + low overhead.
- Long-poll vs SSE for generation status — long-poll v1 (simpler), SSE upgrade trigger documented.
- Curated Google Fonts list — sourced before beta.
- Stock asset seed library — partner with Pexels/Unsplash API or curate manually for v1.
- Secondary region for EU residency — defer until first EU enterprise customer.
