# Studio v1 — Implementation Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan slice-by-slice. Steps in each slice file use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Studio v1 — a multi-tenant SaaS that turns a brief plus a brand kit into finished, on-brand marketing images via AI background generation + server-side template composition.

**Architecture:** Next.js 15 (App Router) on AWS Lambda via OpenNext. Postgres-on-Neon with RLS-enforced multi-tenancy. SQS + Lambda worker pipeline (no Step Functions in v1). Multi-provider AI gateway behind a single internal interface. Satori-based template renderer. Clerk for auth, Stripe for billing.

**Tech Stack:** TypeScript + pnpm workspaces · Next.js 15 (App Router, RSC) · Tailwind + shadcn/ui · Drizzle ORM · Postgres + pgvector · S3 + CloudFront · SQS · AWS Lambda · OpenNext · Clerk · Stripe Billing · Satori + Resvg · Sharp · Vitest + Playwright · Resend · Sentry.

**Companion docs:**
- [PRD](../specs/2026-04-25-layertone-v1-prd.md)
- [Spec](../specs/2026-04-25-layertone-v1-spec.md)
- [Architecture](../specs/2026-04-25-layertone-v1-architecture.md)
- [UI prompts](../specs/2026-04-25-layertone-v1-ui-prompts.md)

**Slice budget:** Each slice file is sized to fit comfortably in a 200k-token agent context window (slice content ≤ ~30k tokens; agent has ≥ 170k for spec lookups + edits + tests).

**Quality bar:** Production v1. No MVP framing. Every shipped feature is full-fidelity production code. Testing: Unit (Vitest) + Component (RTL) + Integration (Vitest against Docker Compose, AI_MODE=mock) + E2E (Playwright). NO automated visual regression / load tests / migration safety automation.

---

## How to use this plan

1. Open `INDEX.md` to find the next pending slice.
2. Open the slice file (e.g., `slice-01-monorepo-bootstrap.md`).
3. Verify all dependencies in the slice header are completed.
4. Execute steps in order. Each step is checkbox-tracked.
5. Run the verification commands at the end. Commit with the suggested message.
6. Tick the slice off in this index.
7. Move to next slice.

If a slice depends on multiple prior slices, all must be complete before starting. If a slice can run in parallel with others (rare in this plan), that is noted in the slice file.

---

## Phase 0 — Foundation (slices 01-05)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 01 | [slice-01-monorepo-bootstrap.md](slice-01-monorepo-bootstrap.md) | pnpm workspaces, TypeScript, root config, package layout | — | Repo structure: `apps/web`, `apps/worker`, `packages/db`, `packages/shared`, `packages/gateway`, `packages/renderer` |
| 02 | [slice-02-tooling.md](slice-02-tooling.md) | ESLint, Prettier, Vitest config, Playwright config, basic scripts | 01 | All linting/test commands wired |
| 03 | [slice-03-ci-skeleton.md](slice-03-ci-skeleton.md) | GitHub Actions workflows: lint, typecheck, unit, integration, E2E gates | 02 | CI passes on a no-op PR |
| 04 | [slice-04-docker-compose-local.md](slice-04-docker-compose-local.md) | Docker Compose with Postgres+pgvector, MinIO, ElasticMQ, Mailpit; bootstrap scripts | 02 | `make dev` boots local stack |
| 05 | [slice-05-config-and-adapters.md](slice-05-config-and-adapters.md) | `config.ts` env-flag loading + adapter interfaces (`AuthProvider`, `Storage`, `Queue`, `BillingProvider`, `AIProvider`, `EmailProvider`, `Telemetry`) + factory wiring | 04 | Adapter selection by env at boot |

## Phase 1 — Database schema (slices 06-09)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 06 | [slice-06-drizzle-and-identity-schema.md](slice-06-drizzle-and-identity-schema.md) | Drizzle setup + migration runner; first migration: `users`, `workspaces`, `workspace_members`, `audit_log`; **RLS enabled with policies and tenancy property test harness** | 05 | DB up + RLS enforced + identity model |
| 07 | [slice-07-brand-schema.md](slice-07-brand-schema.md) | Migration: `brands`, `brand_assets`, `projects` with RLS + indexes | 06 | Brand domain tables ready |
| 08 | [slice-08-catalog-schema.md](slice-08-catalog-schema.md) | Migration: `moods`, `templates`, `mood_template_bindings`, `stock_assets`, `price_book_entries` (all global, no RLS; admin role policy) | 06 | Catalog tables ready |
| 09 | [slice-09-generation-and-billing-schema.md](slice-09-generation-and-billing-schema.md) | Migration: `generations`, `generation_variants`, `caption_jobs`, `credit_ledger_entries`, `subscriptions` with RLS + indexes (incl. `inspiration_image_s3_key` and `inspiration_influence` per spec D15) | 07, 08 | Generation + billing tables ready |

## Phase 2 — Auth & workspace (slices 10-12)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 10 | [slice-10-auth-adapter.md](slice-10-auth-adapter.md) | Clerk JWT verification + dev-bypass adapter (AUTH_MODE=clerk\|dev); middleware that sets `app.current_workspace_id` per request | 06 | Authenticated request context |
| 11 | [slice-11-clerk-webhook-bootstrap.md](slice-11-clerk-webhook-bootstrap.md) | Clerk webhook → create user, personal workspace, owner membership, initial 30-credit grant; Stripe customer provisioned async | 10, 09 | New users land with a workspace + credits |
| 12 | [slice-12-workspace-and-member-api.md](slice-12-workspace-and-member-api.md) | API: list workspaces, switch (refreshes JWT claim), invite member, accept, change role, revoke | 11 | Workspace + roles fully functional |

## Phase 3 — Storage + brand kit (slices 13-15)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 13 | [slice-13-storage-adapter.md](slice-13-storage-adapter.md) | S3/MinIO adapter; signed-URL minting (PUT + GET); per-workspace prefix enforcement | 05 | Storage primitives ready |
| 14 | [slice-14-brand-and-asset-api.md](slice-14-brand-and-asset-api.md) | Brand CRUD + asset upload (logo SVG sanitize via DOMPurify-svg + svgo, PNG re-encode via sharp, EXIF strip, embedding via OpenAI/Claude embedding API) | 07, 13 | Brands and assets manageable |
| 15 | [slice-15-url-extraction.md](slice-15-url-extraction.md) | SSRF-safe URL fetcher; extract title, dominant colors, candidate logos, sitemap-discovery for reference image candidates | 14 | URL-based brand pre-fill works |

## Phase 4 — Catalogs (slices 16-18)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 16 | [slice-16-mood-admin-api.md](slice-16-mood-admin-api.md) | Mood CRUD admin API + mood-template binding endpoints + lifecycle (draft/publish/archive) | 08 | Moods managed by admin |
| 17 | [slice-17-template-admin-api.md](slice-17-template-admin-api.md) | Template CRUD admin API + JSX-source storage + slot/text-safe-zone schema validation + `requires_browser_render` flag + supported aspect ratios | 08 | Templates managed by admin |
| 18 | [slice-18-stock-and-pricebook-admin.md](slice-18-stock-and-pricebook-admin.md) | Stock asset upload + tagging + license; price book CRUD with versioning + effective-from/to | 08, 13 | Stock library + price book |

## Phase 5 — Credit ledger (slices 19-20)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 19 | [slice-19-ledger-primitives.md](slice-19-ledger-primitives.md) | Atomic ledger ops: `reserve`, `commit`, `release`, `topup`, `refund`, `adjustment`, `grant`; idempotency by key; balance-non-negative invariant | 09 | Credit math implemented |
| 20 | [slice-20-ledger-property-tests-and-recon.md](slice-20-ledger-property-tests-and-recon.md) | Property tests (fast-check 10k random walk); RLS isolation property test; daily reconciliation job (Stripe ↔ ledger) | 19 | Ledger correctness proved |

## Phase 6 — AI Gateway (slices 21-24)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 21 | [slice-21-gateway-interface-and-mock.md](slice-21-gateway-interface-and-mock.md) | `ImageProvider` + `TextProvider` + `VisionProvider` interfaces; mock provider keyed by prompt hash; routing module with promotion/fallback table | 05 | Gateway core ready |
| 22 | [slice-22-flux-and-bedrock-providers.md](slice-22-flux-and-bedrock-providers.md) | Flux 1.1 Pro provider (Replicate); Bedrock Stable Diffusion 3.5 + Nova Canvas fallback | 21 | Default + fallback models work |
| 23 | [slice-23-openai-recraft-providers.md](slice-23-openai-recraft-providers.md) | gpt-image-1 provider (OpenAI direct, multi-image); Recraft V3 provider; image-to-image promotion routing | 21 | Premium + design-y models work |
| 24 | [slice-24-safety-and-vision-fallback.md](slice-24-safety-and-vision-fallback.md) | Pre-flight moderation (OpenAI Moderation); post-flight image NSFW classifier (Bedrock); Anthropic Claude vision for inspiration→description fallback | 22, 23 | Gateway safe + i2i-fallback path |

## Phase 7 — Template renderer (slices 25-26)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 25 | [slice-25-satori-renderer.md](slice-25-satori-renderer.md) | Satori + Resvg renderer Lambda; brand-font loading + `/tmp` cache; template JSX sandbox compile; output at exact pixel dimensions per output_target | 13, 17 | Templates render to PNG |
| 26 | [slice-26-puppeteer-fallback.md](slice-26-puppeteer-fallback.md) | Puppeteer-based fallback renderer (chromium-aws-lambda layer) for templates with `requires_browser_render = true` | 25 | Browser-render path ready |

## Phase 8 — Generation pipeline (slices 27-30)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 27 | [slice-27-platform-formats-and-output-target.md](slice-27-platform-formats-and-output-target.md) | Platform formats lookup at `apps/web/lib/output-targets.ts`; Zod validation for `output_target` field; mood × aspect-ratio compatibility check | 16 | Output target server-side resolved |
| 28 | [slice-28-inspiration-upload.md](slice-28-inspiration-upload.md) | `POST /uploads/inspiration` endpoint with sharp normalization, 24h TTL cleanup job, claim-on-generation flow | 13 | Inspiration uploads work |
| 29 | [slice-29-generations-api.md](slice-29-generations-api.md) | `POST /generations` (validate, estimate, reserve, insert, enqueue), `GET /generations/{id}` long-poll endpoint | 19, 21, 27, 28 | Generation API live |
| 30 | [slice-30-worker-pipeline.md](slice-30-worker-pipeline.md) | Worker Lambda: SQS handler, prompt builder, gateway call, renderer call, ledger commit, fan-in atomic completion, failure paths | 25, 26, 29 | End-to-end generation works |

## Phase 9 — Captions (slice 31)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 31 | [slice-31-caption-pipeline.md](slice-31-caption-pipeline.md) | `POST /captions` API + worker calling `TextProvider` (Anthropic Claude Haiku); ledger reservation + commit | 19, 21 | Caption generation works |

## Phase 10 — Stripe billing (slices 32-34)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 32 | [slice-32-stripe-subscriptions.md](slice-32-stripe-subscriptions.md) | Stripe products + prices for tiers; checkout session for plan signup; subscription webhooks (`invoice.paid`, `customer.subscription.created/updated/deleted`); plan-change handling | 19 | Subscriptions work end-to-end |
| 33 | [slice-33-stripe-topups.md](slice-33-stripe-topups.md) | PAYG top-up products; checkout session; `checkout.session.completed` webhook → ledger `topup` entry | 32 | Top-ups work |
| 34 | [slice-34-stripe-dunning-refunds-recon.md](slice-34-stripe-dunning-refunds-recon.md) | Dunning state machine (read-only on `unpaid`); `charge.refunded` → paired `refund` ledger entry; daily reconciliation job alerts on drift | 32, 33 | Billing edge cases handled |

## Phase 11 — Frontend foundation (slices 35-36)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 35 | [slice-35-frontend-foundation.md](slice-35-frontend-foundation.md) | Tailwind + shadcn/ui setup; design tokens; theme; reusable primitives (Button, Input, Toggle, Select, Modal, Drawer, Toast); `app/layout.tsx` shell | 02 | Frontend primitives ready |
| 36 | [slice-36-app-shell.md](slice-36-app-shell.md) | Top bar (wordmark, workspace switcher, credit pill, avatar menu) + left sidebar (Generate, History, Brands, Projects, Stock library) + collapse-to-drawer mobile | 35, 12 | Authenticated app shell |

## Phase 12 — Frontend onboarding (slices 37-38)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 37 | [slice-37-auth-pages.md](slice-37-auth-pages.md) | Sign-up + sign-in routes that mount Clerk's hosted components with Studio theming | 35, 10 | Auth UI live |
| 38 | [slice-38-brand-setup-wizard.md](slice-38-brand-setup-wizard.md) | 6-step wizard (identify, logo, palette, fonts, voice, references) with URL extraction integration | 36, 14, 15 | Onboarding works |

## Phase 13 — Frontend generation (slices 39-40)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 39 | [slice-39-generation-form.md](slice-39-generation-form.md) | Generation form: output target picker (social chips + Just-an-image), brief field, inspiration upload, brand selector, mood picker, toggles panel, live cost estimate, submit | 36, 27, 28, 29 | Users can submit a generation |
| 40 | [slice-40-generation-results.md](slice-40-generation-results.md) | Results page: variants grid, skeleton/animated/failed states, edit-text drawer (free re-render), regenerate button (chargeable), download/copy, caption modal | 39, 31 | Users see and interact with results |

## Phase 14 — Frontend brand/history/moods/billing (slices 41-43)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 41 | [slice-41-brand-editor-and-history.md](slice-41-brand-editor-and-history.md) | Brand kit editor (header card + Colors / Fonts / Voice / References / Danger Zone tabs); history list page with filters + search | 36, 14 | Brand + history UIs |
| 42 | [slice-42-mood-browser.md](slice-42-mood-browser.md) | Full-page mood browser: tabs (All / Right now / Always / Coming soon), search, mood card grid, click-to-select-and-return | 36, 16 | Mood discovery UI |
| 43 | [slice-43-billing-page.md](slice-43-billing-page.md) | Billing page: current plan card, credit balance + sparkline, top-up packs grid, Stripe Customer Portal handoff, invoice list, plan-comparison accordion | 36, 32, 33 | Self-serve billing |

## Phase 15 — Admin back-office (slices 44-46)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 44 | [slice-44-admin-shell-and-mood-studio.md](slice-44-admin-shell-and-mood-studio.md) | Admin route group + role gate + audit-log writer; Mood Studio page (per spec § 5 / UI Prompt 11) | 36, 16 | Admin can author moods |
| 45 | [slice-45-admin-template-stock-pricebook.md](slice-45-admin-template-stock-pricebook.md) | Template Studio (preview against synthetic brand); Stock library manager; Price book editor (versioned) | 44, 17, 18 | Catalog admin tools |
| 46 | [slice-46-admin-inspector-and-aup.md](slice-46-admin-inspector-and-aup.md) | Generation inspector (per UI Prompt 12); user/workspace search; ledger viewer; provider override; AUP enforcement (suspend/ban + flagged-content list) | 44, 30 | Operator tools complete |

## Phase 16 — Hardening (slices 47-48)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 47 | [slice-47-rate-limit-and-errors.md](slice-47-rate-limit-and-errors.md) | Per-user + per-workspace rate limiter (Postgres-backed counters); concurrent-generation cap by plan; `AppError` class + namespaced error codes + UI translation map | 12, 19 | Abuse + friendly errors handled |
| 48 | [slice-48-observability.md](slice-48-observability.md) | Sentry init (server + client); CloudWatch custom metrics emit (queue depth, gen duration, provider latency); OpenTelemetry placeholder hooks (no collector) | 35, 30 | Production observability skeleton |

## Phase 17 — Marketing & deployment (slices 49-50)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 49 | [slice-49-marketing-landing.md](slice-49-marketing-landing.md) | Public landing page (hero, how-it-works, differentiator, pricing, footer) | 35 | Marketing site live |
| 50 | [slice-50-deployment-and-e2e.md](slice-50-deployment-and-e2e.md) | OpenNext deployment config; AWS resources (CloudFront, Lambda, RDS/Neon link, S3 buckets, SQS queues, Parameter Store); Playwright E2E suite (signup → brand → generate → download → top-up); CI deploy gate | 03, all prior | Production deploy + E2E green |

## Phase 18 — Auth hardening (slice 51)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 51 | [slice-51-clerk-auth-wiring.md](slice-51-clerk-auth-wiring.md) | Wire Clerk auth end-to-end for local and production | 10, 37 | Working Clerk cookie session bridge, webhook setup, redirect checklist |

## Phase 19 — Commercial generation upgrade (slices 52-55)

**Strategy/spec:** [Generation Page Commercial Builder Spec](2026-05-03-generation-page-commercial-builder-spec.md)

| # | File | Goal | Depends on | Produces |
|---|---|---|---|---|
| 52 | [slice-52-product-workspace-schema-and-api.md](slice-52-product-workspace-schema-and-api.md) | Product lines, products, variants, product assets, and API | 07, 13, 14 | Reusable product workspace for commercial generation |
| 53 | [slice-53-commercial-generation-contract.md](slice-53-commercial-generation-contract.md) | Structured commercial generation input, estimate, and preflight | 52, 29, 30 | Backend can validate, price, and store commercial campaign requests |
| 54 | [slice-54-generation-page-commercial-redesign.md](slice-54-generation-page-commercial-redesign.md) | `/generate` Quick Create + Campaign Builder redesign | 52, 53, 35, 36, 39 | Commercial-grade generation UI with live warnings and estimates |
| 55 | [slice-55-output-packages-and-quality-checks.md](slice-55-output-packages-and-quality-checks.md) | Multi-format packages, consistency, grouped results, quality checks | 53, 54, 40 | Campaign packages and resize/ad packs instead of one-off images |
| 56 | [slice-56-executable-prompt-template-system.md](slice-56-executable-prompt-template-system.md) | YAML prompt templates, Quick Create path routing, variable validation, and overlay-aware prompt building | 53, 54, 55 | Maintainable prompt system for Quick Create |
| 57 | [slice-57-campaign-builder-prompt-templates.md](slice-57-campaign-builder-prompt-templates.md) | Campaign Builder-specific prompt routes and templates | 56 | Maintainable prompt system for Campaign Builder |

---

## Slice ordering rules

- Slices in the same phase can theoretically run in parallel **only** if no dependency arrow connects them. In practice, run sequentially unless the executor explicitly chooses parallel subagent dispatch.
- A phase boundary means all slices in the prior phase are complete.
- Slices marked with multiple deps cannot start until all are done.

## Cross-cutting reminders for every slice

1. **TDD discipline.** Every slice's first task block writes a failing test, the next runs it to confirm failure, then implementation, then run-to-pass, then commit. No exceptions.
2. **No MVP framing in code, comments, commit messages, or test names.** Use "v1" or just describe the feature directly.
3. **Production code, not stubs.** Even simple endpoints validate fully, return typed errors, and write to `audit_log` when sensitive. Skipping validation is a slice failure.
4. **Multi-tenant safety.** Any code that touches DB inside a tenant context must run inside a transaction with `app.current_workspace_id` set. Never hand-roll workspace_id WHERE clauses — rely on RLS.
5. **Idempotency on writes.** Anything that mutates the ledger or external state must accept an idempotency key.
6. **Adapter discipline.** No Lambda/Clerk/Stripe-specific code outside the adapter packages. App code calls interfaces.
7. **Frequent commits.** Each slice ends with one commit. Larger slices may have intermediate commits at task boundaries — explicit in the slice file.
8. **Every slice ends with verification commands** that confirm the slice's Definition of Done. The agent must run these before marking the slice complete.

---

## Conventions used in slice files

Each slice file follows this template:

```
# Slice NN — Title

**Phase:** N — Phase name
**Depends on:** comma-separated slice numbers
**Spec references:** specific section anchors in the spec/architecture docs
**Definition of done:** what this slice produces, observable

## Files
- Create: ...
- Modify: ...
- Test: ...

## Tasks
- [ ] Step 1: write failing test (with code)
- [ ] Step 2: run test to verify failure (with command + expected output)
- [ ] Step 3: implement (with code)
- [ ] Step 4: run test to verify pass (with command + expected output)
- [ ] Step 5: commit (with message)

## Verification
- Commands the agent must run before marking slice complete
- Expected output

## Commit message
- Single suggested commit message
```

---

## Progress tracking

Mark slices complete by ticking them here as you finish each one.

### Phase 0 — Foundation
- [ ] 01 — Monorepo bootstrap
- [ ] 02 — Tooling
- [ ] 03 — CI skeleton
- [ ] 04 — Docker Compose local
- [ ] 05 — Config and adapters

### Phase 1 — Database schema
- [ ] 06 — Drizzle + identity schema + RLS
- [ ] 07 — Brand schema
- [ ] 08 — Catalog schema
- [ ] 09 — Generation + billing schema

### Phase 2 — Auth & workspace
- [ ] 10 — Auth adapter
- [ ] 11 — Clerk webhook bootstrap
- [ ] 12 — Workspace + member API

### Phase 3 — Storage + brand kit
- [ ] 13 — Storage adapter
- [ ] 14 — Brand + asset API
- [ ] 15 — URL extraction

### Phase 4 — Catalogs
- [ ] 16 — Mood admin API
- [ ] 17 — Template admin API
- [ ] 18 — Stock + pricebook admin

### Phase 5 — Credit ledger
- [ ] 19 — Ledger primitives
- [ ] 20 — Ledger property tests + reconciliation

### Phase 6 — AI Gateway
- [ ] 21 — Gateway interface + mock
- [ ] 22 — Flux + Bedrock providers
- [ ] 23 — OpenAI + Recraft providers
- [ ] 24 — Safety + vision fallback

### Phase 7 — Template renderer
- [ ] 25 — Satori renderer
- [ ] 26 — Puppeteer fallback

### Phase 8 — Generation pipeline
- [ ] 27 — Platform formats + output target
- [ ] 28 — Inspiration upload
- [ ] 29 — Generations API
- [ ] 30 — Worker pipeline

### Phase 9 — Captions
- [ ] 31 — Caption pipeline

### Phase 10 — Stripe billing
- [ ] 32 — Subscriptions
- [ ] 33 — Top-ups
- [ ] 34 — Dunning + refunds + reconciliation

### Phase 11 — Frontend foundation
- [ ] 35 — Frontend foundation
- [ ] 36 — App shell

### Phase 12 — Frontend onboarding
- [ ] 37 — Auth pages
- [ ] 38 — Brand setup wizard

### Phase 13 — Frontend generation
- [ ] 39 — Generation form
- [ ] 40 — Generation results

### Phase 14 — Frontend brand/history/moods/billing
- [ ] 41 — Brand editor + history
- [ ] 42 — Mood browser
- [ ] 43 — Billing page

### Phase 15 — Admin back-office
- [ ] 44 — Admin shell + Mood Studio
- [ ] 45 — Template Studio + Stock + Pricebook
- [ ] 46 — Generation inspector + AUP

### Phase 16 — Hardening
- [ ] 47 — Rate limit + errors
- [ ] 48 — Observability

### Phase 17 — Marketing & deployment
- [ ] 49 — Marketing landing
- [ ] 50 — Deployment + E2E
