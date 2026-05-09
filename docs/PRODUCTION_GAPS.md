# Production-Readiness Gap Document — Studio / Vyora

**Assessed:** 2026-05-09 against branch `master` at HEAD `b771e81`.
**Scope:** Feature-completeness only. Build, CI, test infra, deployment pipelines are explicitly **out of scope** per the user's request.
**Method:** Read every adapter factory, every API route, every onboarding/billing/settings/admin page; grep for `TODO`, `FIXME`, `not implemented`, `not wired`, `Coming soon`, `placeholder`; verified each finding with a direct file/line reference. No reliance on `plans/INDEX.md` checkboxes — those are a planning artifact, not ground truth.

---

## TL;DR

The runtime path that turns *brief → AI image → result* is functional end-to-end (web → SQS → worker → real AI providers → MinIO/S3 → polled UI). Auth (Clerk + dev fallback), billing (Stripe + stub), AI gateway (OpenAI / Replicate / Recraft / Bedrock / Anthropic), storage (S3 + MinIO + CloudFront signing), queue (SQS + ElasticMQ), and the admin back-office (AUP, moods, templates, pricebook, stock, users, landing-hero, generation inspector) are all implemented.

The gaps that block charging real customers fall into a small list:

| # | Gap | Severity |
|---|---|---|
| 1 | **No email adapter implementation** — interface exists, factory returns an unwired Proxy that throws on first method call | Blocker |
| 2 | **No workspace-invite flow** — neither UI nor API endpoint exists; multi-seat is unreachable | Blocker for Business/Agency tiers |
| 3 | **In-house subscription upgrade unwired in UI** — `/api/billing/subscription` exists but every "Upgrade/Switch" button bounces to the Stripe Customer Portal | Important |
| 4 | **`Gateway.embedImage()` throws** — vision-based similarity / image-to-image embeddings unavailable | Important if image-similarity is a v1 feature, otherwise nice-to-have |
| 5 | **BFL Flux provider missing** — `BFL_API_KEY` documented but no `bfl.ts` provider exists; only Replicate-hosted Flux ships | Nice-to-have (Replicate Flux works) |
| 6 | **Brand uniqueness was unenforced** — fixed today (DB unique index + 409 on duplicate); flagged here for the record | Resolved |

There are also several **operational gaps surfaced during today's prod deploy** (TypeScript errors that blocked `next build`, missing prod start script for the worker, inconsistent placeholder-secret tolerance) — listed in section D.

---

## A. Blockers

### A1. ~~Email adapter is completely unwired~~ — **resolved**
The new `@vyora/email` package implements three providers (`ConsoleEmailProvider`, `MailpitEmailProvider`, `ResendEmailProvider`) plus a small template registry (`workspace.invite`, `billing.dunning`, `billing.receipt`, `user.welcome`). `packages/shared/src/adapters/factory.ts` selects the provider based on `EMAIL_MODE` (resend / mailpit / console), and the schema now requires `RESEND_API_KEY` whenever `EMAIL_MODE=resend`. `EmailProvider`/`EmailMessage` types moved into `@vyora/email`; `@vyora/shared/adapters/types` re-exports them for backwards compatibility.

End-to-end smoke test (Mailpit): `adapters.email.send({...template: "user.welcome"})` returned an id and the message landed in Mailpit's inbox at http://localhost:8025.

Tests: 10 unit tests in `packages/email/src/*.test.ts` cover template rendering (HTML escaping, every registered template), Console (sink + recipient normalization), Mailpit (nodemailer.sendMail call shape), and Resend (request URL/headers/body, 401 + 422 error mapping).

Customer flows still need to be wired to actually call `adapters.email.send` — invite flow doesn't exist yet (see A2), and the Stripe webhook handler doesn't currently send dunning emails. But the underlying adapter is now production-ready.

---

### A2. Workspace-invite flow has no UI and no API endpoint
**Files inspected:**
- `apps/web/app/api/workspaces/` — only `route.ts` (GET workspaces) and `switch/` (switch active workspace) exist; **no `invite/`, no `members/` endpoint**
- `apps/web/app/(app)/settings/page.tsx` — grep for `invite` / `Invite` / `Coming soon` returns zero matches
- `docs/LOCAL_DEV_SETUP.md:500` claims "invite-member API works server-side, but the frontend invite form is on the settings page (Coming soon)" — the docs are wrong; **neither side exists**

The DB schema supports it: `workspace_members` has `accept_invite_token` and `invited_at` columns ready for the flow.

**Customer-visible impact:** Business ($129) and Agency ($299) plans advertise multi-seat collaboration; today there is no way for a workspace owner to invite anyone. The only way a second user joins is signing up under their own Clerk account → bootstrapping their own personal workspace.

**Severity:** Blocker for Business/Agency, Important for Pro (which advertises 3 seats).

---

## B. Important

### B1. In-house subscription upgrade flow is unwired in UI
**Endpoint exists:** `apps/web/app/api/billing/subscription/route.ts` — POST handler creates a Stripe Checkout session via `createSubscriptionCheckout`.

**UI gap:** `apps/web/components/billing/billing-page.tsx:485-492` renders Upgrade/Switch buttons in the plan-comparison table:

```tsx
<button … onClick={() => void portal.openPortal()}>
  {p.price > (currentPlan?.price ?? 0) ? "Upgrade" : "Switch"}
</button>
```

Every button — and the standalone "Change plan" button at line 202 — calls `portal.openPortal()`, which redirects to the Stripe Customer Portal (`/api/billing/portal`). The dedicated `/api/billing/subscription` route is unreachable from the UI.

**Customer-visible impact:** Self-serve plan upgrades work via the Stripe Customer Portal, but the experience is jarring (full page redirect to Stripe-hosted page) and bypasses any in-app upsell/onboarding for the new tier. The codebase already has the cleaner inline Checkout path; it just isn't surfaced.

**Severity:** Important. Customers can still upgrade; the polished path is wasted code.

---

### B2. `Gateway.embedImage()` throws unconditionally
**File:** `packages/gateway/src/gateway.ts:73-76`

```ts
async embedImage(_s3Key: string): Promise<{ vector: number[] }> {
  // Implemented via vision describe → embed in slice 24
  throw new Error("embedImage not wired until slice 24");
}
```

`embedText()` directly above it works (line 70-72: `return this.text.embed(text);`). The image branch is the explicit gap.

**Customer-visible impact depends on whether v1 ships any image-similarity or "more like this" feature.** Inspiration-image describing (vision → text → embed) and stock-image semantic search would both need this. Spec § 4 mentions vision-based fallback for inspiration→description; today that path's final embed step throws.

**Severity:** Important if v1 ships any inspiration-image semantic search; nice-to-have otherwise.

---

### B3. ~~BFL (Black Forest Labs) provider missing~~ — **resolved**
Sub-project B (image-providers) shipped `packages/gateway/src/providers/bfl.ts`
serving `photoreal-pro` (Flux 1.1 Pro) and `photoreal-ultra` (Flux 1.1 Pro Ultra)
direct against `api.bfl.ai/v1`. Routing default for `photoreal-pro` still
points to the Replicate-hosted Flux entry (`economy`-priced); admins can
promote the BFL-direct entry through `/admin/routing` whenever lower
latency wins over Replicate's pricing.

---

### B5. Manual crop tool — legacy variants are not croppable
Sub-project D ships an interactive crop & resize editor on the result page,
backed by `POST /api/generations/[id]/variants/[vid]/recompose` (Sharp inline,
no SQS). It depends on `generation_variants.background_s3_key` being set —
the column is populated for every generation post-A's pipeline (~2026-04 onward),
but legacy rows from before that are null.

**Behaviour:** the variant card hides the **Crop & Resize** action when
`backgroundS3Key` is null. This is by design (no programmatic crop hints, no
re-rendering of legacy outputs from the model id alone) and is captured in
spec § 1.

**Severity:** Informational. No code change recommended; legacy rows age out.

---

### B4. Reference-image upload doc is stale (no code gap)
`docs/LOCAL_DEV_SETUP.md:501` claims the onboarding wizard's References step "doesn't yet POST to `/api/brands/[id]/assets` (uploaded files are stored to sessionStorage and discarded)."

**Reality:** `apps/web/components/onboarding/brand-wizard.tsx` does upload references through `/api/brands/[id]/assets`. The doc is out of date.

**Severity:** Informational. Action: edit the doc to remove the obsolete bullet.

---

## C. Nice-to-have

### C1. OpenTelemetry collector is a no-op
**File:** `packages/observability/src/otel-stub.ts`

`tagSpan()` is sprinkled at seams across the gateway and worker but is currently a no-op. Sentry covers errors + spans; CloudWatch covers metrics. OTEL is a documented future-toggle, acceptable for v1.

### C2. Mood "Coming soon" tab
`apps/web/components/moods/moods-browser.tsx:66` defines a tab labeled "Coming soon" — this is intentional product copy for an empty future-mood category, not unfinished code.

---

## D. Operational gaps surfaced during today's deploy

These didn't appear in the feature audit but are real production blockers I tripped over while standing up the prod stack today.

### D1. `pnpm build` failed on three pre-existing TypeScript errors
All three were null/undefined leaks where DB-nullable columns flowed into prop types declared as `string`. Fixed today — flagging here so reviewers know they were latent:

| File | Line | Fix applied |
|---|---|---|
| `apps/web/components/history/history-list.tsx` | 12 | `brandId: string` → `brandId: string \| undefined` |
| `apps/web/components/history/history-list.tsx` | 197 | `dot(g.brandId)` → `dot(g.brandId ?? g.id)` |
| `apps/web/app/admin/generations/[id]/page.tsx` | 60-64 | Brand query guarded by `generation.brandId` truthiness, mirroring the existing mood pattern |
| `apps/web/components/admin/generation-inspector.tsx` | 41 | `brandId: string` → `brandId: string \| null` |

**Root cause:** unbranded generations are now allowed (slice "nullable_generation_brand" migration shipped) but the typed prop interfaces and a few query callsites weren't propagated. Likely more null-safety holes in less-trodden code paths — recommend a sweep.

### D2. Worker has no production start script
**File:** `apps/worker/package.json`

```json
"scripts": {
  "build": "tsc -p tsconfig.json",
  "dev": "tsx --env-file=../../.env.local scripts/dev.ts",
  ...
}
```

There is no `start` script. The "production" deploy path the codebase implies is **AWS Lambda** (the `infra/` directory is CDK; `src/handler.ts` and `src/caption-handler.ts` export Lambda-style SQS event handlers), so a long-running container start command was never written. For any non-Lambda hosting (which is what the user has on Rancher Desktop today), the only working start is `pnpm --filter @vyora/worker dev` — `tsx` running a poll loop. **That's a `tsx`-on-`node` dev launcher running in production**, with no graceful shutdown, no health endpoint, and no restart-on-crash supervisor.

**Severity:** Blocker for any non-Lambda deployment. If the prod target is Lambda, this is fine.

### D3. ~~Strict `CLERK_WEBHOOK_SECRET` validation, but the webhook can't be invoked locally~~ — **resolved**
`CLERK_WEBHOOK_SECRET` is now optional. The schema (`packages/shared/src/config.ts`) no longer requires it under `AUTH_MODE=clerk`, and `ClerkWebhookHandler.handle` (`packages/auth/src/webhook.ts`) returns `503 webhook-not-configured` if an event arrives while the secret is unset — so loosening the schema doesn't open a path to processing unsigned events. Operators on laptops without a public URL no longer need a placeholder.

### D4. ~~`STRIPE_WEBHOOK_SECRET` not required by schema → silent risk of paid checkouts that never grant credits~~ — **resolved**
The schema now requires `STRIPE_WEBHOOK_SECRET` whenever `BILLING_MODE != stub`, alongside `STRIPE_SECRET_KEY`. The validation error message tells the operator exactly how to fix it (`stripe listen --forward-to …`) or how to opt out (`BILLING_MODE=stub`). Note this change will fail-fast on any existing env that had `STRIPE_WEBHOOK_SECRET=` empty — that's the intended surfacing.

`STRIPE_PRICE_*` IDs are still optional and not validated; missing prices will just result in empty plan tiles in `/billing`. Tightening those is a follow-up.

### D5. ~~Model identifiers in `docs/openapi.txt` look invalid~~ — **partially resolved**
Sub-project B validated the provider matrix against current vendor docs
(see `docs/superpowers/specs/2026-05-09-image-providers-research-and-wiring-design.md`
§ 8). Validated identifiers now seeded in `models`:

- `gemini-2.5-flash-image` (was: `gemini-2.5-image-preview` — never went GA)
- `gemini-3-pro-image-preview` (was: `gemini-2.5-image-pro` — superseded by Gemini 3 Pro)
- `flux-pro-1.1` and `flux-pro-1.1-ultra` (BFL direct, replaces vague `bfl-flux-1.1` references)
- `amazon.nova-canvas-v1:0`, `stability.sd3-large-v1:0` (unchanged)

The OpenAI image identifiers (`gpt-image-1` for `text-master`, `gpt-image-2`
for `text-master-pro`) still need a real-key smoke before the first paid
generation runs. The provider switches by internal code now, so swapping
the underlying vendor id is a one-line change in `openai-image.ts`.

**Severity:** Important — surfaces only when the first paid OpenAI generation runs.

### D6. `scripts/seed.ts` was inserting dev user/workspace under any AUTH_MODE
Fixed today: the dev user, dev workspace, dev member, and 1000-credit dev-grant inserts are now gated on `config.auth.mode === "dev"`. Under Clerk, running `pnpm db:seed` is now a no-op for that block. Production reference data (templates, price book) remains unconditional.

Brand uniqueness on `(workspace_id, name)` is now enforced (`brands_workspace_name_unique`); duplicate POST `/api/brands` returns HTTP 409.

---

## E. Things I could not verify in this audit

- **Spec coverage** — I did not exhaustively diff `specs/2026-04-25-studio-v1-spec.md` against the code. There may be documented behaviors (rate limits, AUP escalation thresholds, specific model-routing rules) that the code does not implement.
- **`packages/api/src/*` business logic** — I read brand, billing-page, the factory, and routes; I did not deeply trace `generation.ts`, `caption.ts`, or `product.ts` for partially-implemented branches.
- **The 78 `price_book_entries` rows** — I verified they're seeded but did not validate every model/size/premium combination is priced. A missing entry will silently exclude a model from selection.
- **CloudFront signing** — adapter exists; not exercised in today's deploy.

---

## F. Recommended order of attack

If the goal is "stop being a demo, start charging users":

1. **Wire `EmailProvider`** — Mailpit + Resend. Unblocks invites (#A2), dunning, receipts.
2. **Fix the Stripe webhook story** — make `STRIPE_WEBHOOK_SECRET` strictly required when `BILLING_MODE != stub`, document `stripe listen` requirement, smoke-test that a paid top-up actually credits the ledger.
3. **Build the workspace-invite flow** — settings page form + `/api/workspaces/invite` POST + accept-token route + email send. Unlocks Business/Agency tier value.
4. **Surface in-house subscription upgrade** — wire the "Upgrade/Switch" buttons to `/api/billing/subscription` instead of `portal.openPortal()`.
5. **Resolve the worker production-start question** — either commit to Lambda (and document it) or add a `start` script + supervised long-running container.
6. **Decide on `embedImage()`** — implement (vision describe → embedText) or remove the call sites.
7. **Doc cleanup** — `LOCAL_DEV_SETUP.md` § "What's NOT yet wired" is partially obsolete; rewrite from this gap doc.

Items B3 (BFL), C1 (OTEL), C2 (mood tab) are explicitly safe to defer.

---

*This document is a snapshot. Re-run the audit after items 1–4 land — most of the "Important" entries cascade off them.*
