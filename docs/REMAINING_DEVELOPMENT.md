# Remaining Functional Development — Layertone Studio

**Date:** 2026-05-23  
**Scope:** Full audit of the codebase against the v1 PRD and implementation plan index  
**Status key:** ✅ Done · 🔶 Partial / needs polish · ❌ Not started

---

## 1. Executive Summary

The core generation pipeline (Quick Create → worker → results) is functionally complete and running end-to-end in `AI_MODE=mock`. The backend packages (db, auth, billing, gateway, renderer, queue) are substantially complete. The main remaining work falls into five clusters:

1. **Campaign Builder prompt routing** — UI is built but the worker still falls through to the legacy prompt path instead of a dedicated Campaign Builder prompt
2. **Output packages / multi-format delivery** — the UI captures multi-format selections but the worker only generates one output target per job
3. **`embedImage` / brand similarity** — gateway stub throws, so visual brand embedding is non-functional
4. **AWS infrastructure package** — `@layertone/infra` does not exist; the deploy workflow references it but it is absent
5. **E2E tests and deployment** — E2E tests exist but Playwright config is not wired into CI; no OpenNext or CDK config yet

---

## 2. Feature Inventory

### 2.1 Authentication & Workspace

| Feature | Status | Notes |
|---|---|---|
| Clerk sign-in / sign-up UI | ✅ Done | Pages live at `/sign-in`, `/sign-up` |
| Clerk JWT bridge middleware | ✅ Done | Dynamic import in `middleware.ts` |
| Dev-mode auth bypass | ✅ Done | `AUTH_MODE=dev` path wired |
| Clerk webhook → user + workspace creation | ✅ Done | `packages/auth/src/webhook.ts` |
| Workspace switcher UI | ✅ Done | `workspace-switcher.tsx` |
| Invite / accept member flow | ✅ Done | DB queries complete; no invite UI page yet |
| Member invite UI (settings page) | ✅ Done | Invite form + role select + per-member role/revoke buttons in `MemberActions` client component |
| Workspace role change + revoke UI | ✅ Done | `PATCH/DELETE /api/workspaces/members/[userId]` + UI wired |

### 2.2 Brand Kit

| Feature | Status | Notes |
|---|---|---|
| Brand setup wizard (6 steps) | ✅ Done | Full wizard at `/onboarding/brand/[step]` |
| URL extraction pre-fill | ✅ Done | SSRF-safe fetch + color extraction |
| Logo upload + SVG sanitize | ✅ Done | Sharp re-encode + DOMPurify |
| Brand editor page | ✅ Done | Colors / Fonts / Voice / References / Danger tabs |
| Brand asset embedding (OpenAI) | ✅ Done | Real `embedText(description)` call via OpenAI `text-embedding-3-small`; falls back to zero-vector on failure |
| Brand list page | ✅ Done | `/brands` page implemented |
| Brand detail / edit page | ✅ Done | `/brands/[id]` with full editor |
| Brand delete with confirmation | ✅ Done | Danger Zone tab with name-match gate |
| Add/edit product line in brand context | ❌ Not started | Products are created from the Generate form draft picker only; no dedicated brand→products editor UI |

### 2.3 Products & Catalog

| Feature | Status | Notes |
|---|---|---|
| Product CRUD API | ✅ Done | `packages/api/src/product.ts` + routes |
| Product lines, products, variants, assets schema | ✅ Done | `packages/db/src/schema/product.ts` |
| Inline product editor in Quick Create | ✅ Done | `inline-product-editor.tsx` — draft products |
| Product picker in Campaign Builder | ✅ Done | `product-step.tsx` fetches existing products |
| Dedicated products management page | ✅ Done | `/products` page with brand filter, product-line grouping, status badges, archive button; Products link added to sidebar |
| Product variant images (multiple angles) | 🔶 Partial | API supports multiple assets; UI only handles one upload at a time in Quick Create |

### 2.4 Generation — Quick Create

| Feature | Status | Notes |
|---|---|---|
| Quick Create form UI | ✅ Done | Full 3-column layout |
| Output target picker | ✅ Done | All platforms + free-aspect modes |
| Brand / mood / flags selection | ✅ Done | Toggles wired |
| Inspiration image upload | ✅ Done | Signed PUT → S3 |
| Campaign fields (title, subtitle, CTA, price, etc.) | ✅ Done | All fields captured |
| Prompt preview dialog | ✅ Done | `/api/generations/prompt-preview` |
| Preflight check panel | ✅ Done | Warnings + estimate displayed |
| Estimate / credit cost display | ✅ Done | Live update |
| Generate submit + redirect to results | ✅ Done | |
| Quick Create prompt templates (YAML) | ✅ Done | 4 templates: image-only, campaign-only, product-only, product-campaign |
| Prompt template modifiers | ✅ Done | brand-basic, brand-logo-overlay, format-* |
| Campaign Builder prompt templates | ✅ Done | Campaign Builder jobs now route to YAML prompt templates via `buildQuickCreatePrompt` |

### 2.5 Generation — Campaign Builder

| Feature | Status | Notes |
|---|---|---|
| Campaign Builder 8-step UI | ✅ Done | All steps rendered |
| Creation type step | ✅ Done | |
| Products step | ✅ Done | |
| Campaign details step | ✅ Done | |
| Template/layout step | 🔶 Partial | Hardcoded family/layout list; not backed by admin-managed templates from DB |
| Brand & mood step | ✅ Done | |
| Composition step | ✅ Done | |
| Output settings step (multi-format) | ✅ Done | UI supports multi-format selection |
| Review rail | ✅ Done | Shows estimate, products, formats |
| Campaign Builder → worker prompt routing | ❌ Not started | Worker currently routes `mode !== "quick"` to legacy prompt builder, not a Campaign Builder-specific prompt |
| Multi-format package delivery | ❌ Not started | Worker generates one output per variant job; no fan-out for multiple formats in Campaign Builder |
| Consistency rendering across formats | ❌ Not started | `outputs.consistency` is captured in state but not used in worker |
| Campaign Builder results review page | ❌ Not started | `generation-view.tsx` shows a placeholder note for Campaign Builder; no dedicated package review UI |

### 2.6 Worker Pipeline

| Feature | Status | Notes |
|---|---|---|
| SQS consumer loop | ✅ Done | |
| Legacy prompt builder | ✅ Done | |
| Quick Create prompt builder (YAML templates) | ✅ Done | |
| Pre-flight text moderation | ✅ Done | OpenAI Moderation / mock |
| Image generation → S3 store | ✅ Done | |
| Satori renderer + brand font/color injection | ✅ Done | |
| Puppeteer fallback renderer | ✅ Done | |
| Ledger commit on success / release on failure | ✅ Done | |
| Worker retry + Bedrock fallback path | ✅ Done | |
| Campaign Builder prompt routing | ✅ Done | `mode === "campaign_builder"` now routes to `buildQuickCreatePrompt` (same YAML templates as Quick Create) |
| Multi-format fan-out per Campaign Builder job | ❌ Not started | |
| `embedImage` (vision → embed) | ✅ Done | Wired: `describeImage(s3Key)` → `embedText(description)` in `gateway.ts` |
| Post-flight image NSFW classifier | ✅ Done | `moderateImage()` called in worker after generation (handler.ts lines 534-546) |
| Inspiration cleanup job (24h TTL) | 🔶 Partial | Script exists; S3 lifecycle policy needs deployment |

### 2.7 Caption Pipeline

| Feature | Status | Notes |
|---|---|---|
| Caption API + worker handler | ✅ Done | |
| Caption UI in results page | ✅ Done | Modal with tone + short options |
| Caption polling | ✅ Done | |
| Caption credit deduction | ✅ Done | |
| Caption copy button in Project detail | ✅ Done | |

### 2.8 Generation Results & History

| Feature | Status | Notes |
|---|---|---|
| Results page with variant grid | ✅ Done | Polling until completed |
| Skeleton / animated / failed states | ✅ Done | |
| Download button | ✅ Done | |
| Copy URL | ✅ Done | |
| Zoom lightbox | ✅ Done | |
| Regenerate variant (chargeable) | ✅ Done | `/api/generations/[id]/variants/[vid]/regenerate` |
| Edit text drawer (free re-render) | ✅ Done | `POST /api/generations/[id]/variants/[vid]/rerender` calls renderer; result URL patched into UI state |
| Add to project from results | ✅ Done | Project create/update from generation view |
| History list page with filters | ✅ Done | Server-side search + pagination in `HistoryPage`; brand filter + search input + prev/next links in `HistoryList` |
| History server-side search / pagination | ✅ Done | `PAGE_SIZE=50` with `.offset(page * PAGE_SIZE)` and `like(generations.brief, '%search%')` |

### 2.9 Projects

| Feature | Status | Notes |
|---|---|---|
| Projects list page | ✅ Done | With generation count, image count, thumbnails |
| Project detail page | ✅ Done | Shows all images + captions |
| Create project from generation | ✅ Done | |
| Rename / delete project | ✅ Done | `ProjectManage` component + `PATCH/DELETE /api/projects/[id]` + DB queries |
| Project-level export (zip download) | ❌ Not started | Not in PRD scope but commonly expected |

### 2.10 Moods

| Feature | Status | Notes |
|---|---|---|
| Moods browser page | ✅ Done | Tabs + search + grid |
| Mood card with color swatches | ✅ Done | |
| Click mood → navigate to Generate with mood pre-selected | ✅ Done | |
| Mood data populated from DB | ✅ Done | Admin must seed moods |
| Mood images (hero/card) | 🔶 Partial | `m.img` rendered if present; no images seeded yet |

### 2.11 Billing

| Feature | Status | Notes |
|---|---|---|
| Credit ledger (reserve/commit/release/topup/grant/refund) | ✅ Done | Property tested |
| Stripe subscriptions (checkout + webhooks) | ✅ Done | |
| Stripe top-up packs (checkout + webhooks) | ✅ Done | |
| Stripe customer portal redirect | ✅ Done | |
| Invoice list on billing page | ✅ Done | |
| Credit sparkline on billing page | ✅ Done | |
| Plan comparison accordion | ✅ Done | |
| Dunning state machine (unpaid → read_only) | ✅ Done | `stripe-webhook.ts` |
| Ledger reconciliation report | ✅ Done | `reconcile.ts` + `reconcile.test.ts` |
| Daily reconciliation cron job | ❌ Not started | Script exists; no Lambda event source / cron trigger configured |
| Stripe price IDs wired to env | 🔶 Partial | All env vars defined; must be seeded with real Stripe price IDs before launch |
| Per-brand add-on billing | ❌ Not started | No Stripe product for per-brand overage; quota enforcement only throws, no upsell flow |

### 2.12 Admin Back-Office

| Feature | Status | Notes |
|---|---|---|
| Admin route group + role gate | ✅ Done | `app/admin/layout.tsx` guards for `admin` role |
| Mood Studio (create/edit/publish/archive) | ✅ Done | Full mood lifecycle |
| Template Studio | ✅ Done | JSX source upload + preview + slot schema |
| Template preview against synthetic brand | ✅ Done | Preview panel with brand name input + color picker; query params drive `GET /api/admin/templates/[id]/preview` |
| Stock library manager | ✅ Done | Upload + tag + license |
| Price book editor (versioned) | ✅ Done | Versioned entries with effective-from/to |
| Generation inspector | ✅ Done | Full status, model override, refund, resume, flag |
| User / workspace search | ✅ Done | Search + detail + ledger viewer |
| Provider override per generation | ✅ Done | |
| AUP enforcement (suspend / flag) | ✅ Done | |
| Admin landing hero editor | ✅ Done | |
| Ledger grant from admin | ✅ Done | |
| Admin audit log | ✅ Done | All admin routes (grant, suspend, flag, refund, resume, override-model, moods, templates, stock, pricebook, landing-hero, aup) write to audit_log via `writeAdminAudit` |
| Admin workspace ledger pagination | ✅ Done | Previous/Next buttons implemented in `workspace-detail.tsx` |

### 2.13 Settings Page

| Feature | Status | Notes |
|---|---|---|
| Workspace overview (plan, credits, seats) | ✅ Done | |
| Member list | ✅ Done | |
| Invite member form | ✅ Done | Inline invite row in settings member table |
| Change member role | ✅ Done | Role dropdown per member row with Save |
| Revoke member | ✅ Done | Remove button per member row |
| Workspace rename | ❌ Not started | Not exposed in settings |

### 2.14 Stock Library (User-Facing)

| Feature | Status | Notes |
|---|---|---|
| Stock browser page | ✅ Done | Signed S3 URLs fetched via `createServerAdapters()` storage; `<img>` tags rendered |
| Stock image display | ✅ Done | Images displayed with `objectFit: cover` in card grid |

### 2.15 Help Page

| Feature | Status | Notes |
|---|---|---|
| Static help page | ✅ Done | 4-card quickstart layout |
| Full help docs / FAQ | ❌ Not started | Placeholder cards only |

### 2.16 Marketing Landing Page

| Feature | Status | Notes |
|---|---|---|
| Hero section | ✅ Done | Dynamic hero cards from DB |
| How it works | ✅ Done | |
| Differentiators | ✅ Done | |
| Pricing table | ✅ Done | |
| Footer | ✅ Done | |
| Real generated images in hero | 🔶 Partial | Hero cards served from `landing_hero_cards` table; admin must upload; falls back to sample images |
| Email capture / waitlist | ❌ Not started | Not in PRD scope for v1 |

---

## 3. Infrastructure & Deployment

| Item | Status | Notes |
|---|---|---|
| Docker Compose local stack | ✅ Done | Postgres, MinIO, ElasticMQ, Mailpit |
| `pnpm dev:offline-ai` script | ✅ Done | |
| `pnpm dev:real-ai` script | ✅ Done | |
| GitHub Actions CI (lint/typecheck/unit/integration) | ✅ Done | All jobs wired |
| CI integration job with Postgres service | ✅ Done | |
| E2E test suite (Playwright) | 🔶 Partial | 4 E2E spec files exist; `playwright.config.ts` exists but CI `deploy.yaml` does not run E2E step |
| E2E CI gate | ✅ Done | `e2e` job in `ci.yaml` with postgres + minio + elasticmq services |
| AWS CDK infra package (`@layertone/infra`) | ❌ Not started | `deploy.yaml` references `pnpm --filter @layertone/infra exec cdk deploy` but the package does not exist |
| OpenNext Lambda build | 🔶 Partial | `build:lambda` script referenced in deploy workflow; needs verification |
| Worker Lambda packaging | 🔶 Partial | Worker `build` script exists; Lambda function definition not in CDK |
| CloudFront distribution | ❌ Not started | No CDK stack |
| SQS queue CDK resource | ❌ Not started | |
| RDS / Neon database config | ❌ Not started | |
| S3 buckets CDK config | ❌ Not started | |
| Parameter Store secrets wiring | ❌ Not started | |
| S3 lifecycle policy for inspiration images (24h TTL) | ❌ Not started | |
| Daily reconciliation cron (EventBridge) | ❌ Not started | |
| Sentry error tracking (server + client) | ✅ Done | `sentry.server.config.ts`, `instrumentation.ts` |
| CloudWatch custom metrics | ✅ Done | `SentryTelemetry.metric()` calls `PutMetricDataCommand`; worker emits `provider.latency_ms`, `variant.duration_ms`, `variant.completed` |
| OpenTelemetry placeholder | ✅ Done | `otel-stub.ts` |

---

## 4. Gateway & AI Providers

| Provider / Feature | Status | Notes |
|---|---|---|
| Mock image provider | ✅ Done | Serves sample PNGs with configurable delay |
| OpenAI gpt-image-1 / gpt-image-2 | ✅ Done | Multi-image, B64 decode |
| Recraft V3 | ✅ Done | |
| Flux 1.1 Pro (Replicate) | ✅ Done | |
| Bedrock Stable Diffusion 3.5 + Nova Canvas | ✅ Done | Fallback path |
| Anthropic text (embeddings via OpenAI proxy) | 🔶 Partial | Partial — routes to OpenAI embeddings |
| Anthropic vision (inspiration→description fallback) | ✅ Done | `anthropic-vision.ts` |
| OpenAI text (captions) | ✅ Done | |
| OpenAI Moderation (pre-flight) | ✅ Done | |
| Bedrock moderation (post-flight) | 🔶 Partial | Provider implemented; not called from worker after image generation |
| `embedImage` (vision → embed) | ✅ Done | Wired via `describeImage` → `embedText` in `gateway.ts` |

---

## 5. Testing Coverage

| Area | Status | Notes |
|---|---|---|
| Ledger property tests (fast-check) | ✅ Done | 10k random walk |
| RLS isolation tests | ✅ Done | Integration |
| Brand asset upload unit tests | ✅ Done | |
| Auth webhook unit tests | ✅ Done | |
| Preflight unit tests | ✅ Done | |
| Output target unit tests | ✅ Done | |
| Prompt template router unit tests | ✅ Done | |
| Generate form component tests (RTL) | ✅ Done | `generate-commercial.test.tsx` |
| Worker integration test | 🔶 Partial | `handler.int.test.ts` exists; tests basic flow against mock |
| Caption pipeline tests | ✅ Done | |
| E2E: signup → generate → download | 🔶 Partial | Written; not in CI |
| E2E: brand setup | 🔶 Partial | Written; not in CI |
| E2E: top-up | 🔶 Partial | Written; not in CI |
| E2E: credit exhaustion | 🔶 Partial | Written; not in CI |
| Visual regression tests | ❌ Not in scope | Explicitly excluded from PRD |
| Load tests | ❌ Not in scope | Explicitly excluded from PRD |

---

## 6. Prioritized Remaining Work

### Priority 1 — Required before soft launch

| # | Work Item | Effort |
|---|---|---|
| P1-1 | **AWS CDK infra package** — Create `packages/infra` with CDK stacks for Lambda (web + worker), SQS, S3, CloudFront, RDS/Neon link, Parameter Store | Large |
| P1-2 | ~~**Campaign Builder worker prompt routing**~~ | ✅ Done |
| P1-3 | **Multi-format output package delivery** — Fan-out worker to generate one variant per selected format in Campaign Builder | Medium |
| P1-4 | ~~**`embedImage` via vision**~~ | ✅ Done |
| P1-5 | ~~**E2E CI gate**~~ | ✅ Done |
| P1-6 | ~~**Stock image display**~~ | ✅ Done |
| P1-7 | ~~**Edit text drawer**~~ | ✅ Done |
| P1-8 | ~~**Bedrock post-flight NSFW check**~~ | ✅ Done |

### Priority 2 — Required for full v1 feature parity

| # | Work Item | Effort |
|---|---|---|
| P2-1 | **Campaign Builder results review UI** — Dedicated package review page showing multi-format outputs grouped by creative | Medium |
| P2-2 | ~~**Settings: invite / role / revoke member UI**~~ | ✅ Done |
| P2-3 | ~~**History pagination + server-side search**~~ | ✅ Done |
| P2-4 | ~~**Products management page**~~ | ✅ Done |
| P2-5 | ~~**Audit log completeness**~~ | ✅ Done |
| P2-6 | ~~**Admin ledger pagination UI**~~ | ✅ Done |
| P2-7 | ~~**Brand asset embedding (real)**~~ | ✅ Done |
| P2-8 | ~~**Template Studio brand picker**~~ | ✅ Done |
| P2-9 | ~~**Rename / delete project UI**~~ | ✅ Done |

### Priority 3 — Pre-production hardening

| # | Work Item | Effort |
|---|---|---|
| P3-1 | **S3 lifecycle policy for inspiration images** | Small |
| P3-2 | **Daily reconciliation EventBridge trigger** | Small |
| P3-3 | **Per-brand overage billing** — Stripe product + upsell flow when brand quota exceeded | Medium |
| P3-4 | ~~**CloudWatch custom metrics emission**~~ | ✅ Done |
| P3-5 | **Mood seed images** — Upload hero/card images for each admin-seeded mood | Content |
| P3-6 | **OpenNext build verification** — Confirm `build:lambda` script produces a deployable artifact | Small |
| P3-7 | **Stripe price ID seeding** — Create Stripe products/prices and populate env vars | Config |
| P3-8 | **Help page full content** — Replace placeholder cards with real FAQ content | Content |

---

## 7. Out of Scope (from PRD — confirmed deferred)

- Social publishing to any platform
- Video / animation generation
- Per-brand role granularity
- SAML / SSO
- Multi-language UI
- Mobile native apps
- Public customer API / webhooks
- Analytics ingestion from social platforms
- User-authored Moods
- Full canvas editor
- Full OpenTelemetry observability pipeline
