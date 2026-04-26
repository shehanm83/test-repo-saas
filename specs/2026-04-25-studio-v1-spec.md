# Functional & Technical Spec — Studio v1

**Status:** Draft for review
**Date:** 2026-04-25
**Owner:** Shehan Fernando
**Quality bar:** **Production v1 — every feature in this spec is built as production-grade code.** No stubs, no half-implementations, no "we'll fix it after launch." Testing breadth is intentionally trimmed (see § 9), but feature code is full-fidelity.
**Companion docs:**
- `2026-04-25-studio-v1-prd.md`
- `2026-04-25-studio-v1-architecture.md`
- `2026-04-25-studio-v1-ui-prompts.md`

---

## 1. Domain model

### 1.1 Entity relationships

```
User (Clerk-authoritative)
  └─ WorkspaceMember (role)
       └─ Workspace (tenancy boundary, billing scope)
            ├─ Subscription (Stripe mirror)
            ├─ CreditLedger (entries: grant / reserve / commit / release / topup / refund / adjustment)
            ├─ Brand (logo, palette, fonts, voice)
            │    ├─ BrandAsset (reference images w/ embedding)
            │    └─ Project (optional grouper / campaign tag)
            │         └─ Generation (brief, brand_id, mood_id?, settings)
            │              └─ GenerationVariant (rendered output, model used, credit cost)
            └─ AuditLog (sensitive events)

Mood (admin-authored, global)
  └─ MoodTemplateBinding → Template

Template (admin-authored, global)
  ├─ slots: [logo, headline, subhead, CTA, decorations]
  ├─ text_safe_zones: rect coords
  ├─ preferred_model
  └─ supported_aspect_ratios

StockAsset (admin-curated, global)
PriceBookEntry (versioned: model × output-size × premium → credits)
```

### 1.2 Tables (Postgres on Neon)

**Tenant-scoped (`workspace_id` on every row, RLS enforced):**

- `workspaces` (id, owner_user_id, plan_code, brand_quota, seat_quota, monthly_credit_grant, stripe_customer_id, status, deleted_at?, created_at)
- `workspace_members` (workspace_id, user_id, role: owner|admin|editor|viewer, invited_at, accepted_at?)
- `brands` (id, workspace_id, name, logo_s3_key, palette jsonb, fonts jsonb, voice_notes, source_url?, created_at)
- `brand_assets` (id, workspace_id, brand_id, kind: logo|reference|icon, s3_key, embedding vector(1536), created_at)
- `projects` (id, workspace_id, brand_id, name, description?, created_at)
- `generations` (id, workspace_id, brand_id, project_id?, mood_id?, brief, settings jsonb, inspiration_image_s3_key text null, inspiration_influence text null check (inspiration_influence in ('subtle','balanced','strong')), price_book_version, status: pending|running|completed|failed, requested_by_user_id, credit_reservation_id, error_payload jsonb?, created_at, completed_at?)
  - `settings` JSON shape:
    ```json
    {
      "output_target": {
        "kind": "social" | "image",
        "platform": "instagram" | "facebook" | "linkedin" | "tiktok" | "pinterest" | "youtube" | "x" | null,
        "format": "post" | "post_portrait" | "story" | "thumbnail" | "pin" | null,
        "aspect_ratio": "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1" | "2:3",
        "width": 1080,
        "height": 1920
      },
      "variant_count": 4,
      "use_brand_colors": true,
      "use_brand_logo": true,
      "use_brand_fonts": true,
      "brand_strict": false,
      "apply_mood_modifiers": true,
      "apply_mood_decorations": true,
      "apply_mood_accent_colors": true,
      "use_premium_model": false
    }
    ```
- `generation_variants` (id, generation_id, template_id, model_used, output_s3_key?, credit_cost, render_ms?, status: queued|running|completed|failed, error_payload jsonb?, created_at, completed_at?)
- `caption_jobs` (id, workspace_id, generation_id?, brief, voice, length_tier, status, output_text?, credit_cost, created_at, completed_at?)
- `credit_ledger_entries` (id, workspace_id, kind: grant|reservation|commit|release|topup|refund|adjustment, amount integer, balance_after integer, generation_id?, stripe_event_id?, idempotency_key UNIQUE, created_at)
- `subscriptions` (workspace_id, stripe_subscription_id, plan_code, status, current_period_start, current_period_end, updated_at)
- `audit_log` (workspace_id, actor_user_id, action, target, payload jsonb, created_at)

**Global (admin-managed, no `workspace_id`):**

- `users` (id, clerk_user_id UNIQUE, email, role: user|admin, created_at) — minimal mirror; Clerk is source of truth
- `moods` (id, slug UNIQUE, name, kind: seasonal|evergreen, valid_from?, valid_to?, prompt_modifiers, negative_prompts, accent_palette jsonb, decoration_tags text[], typography_hint jsonb?, supported_aspect_ratios text[] (subset of {`1:1`, `4:5`, `9:16`, `16:9`, `1.91:1`, `2:3`}), status: draft|published|archived, preview_s3_key?, created_at)
- `mood_template_bindings` (mood_id, template_id, weight)
- `templates` (id, slug UNIQUE, jsx_source text, slots jsonb, text_safe_zones jsonb, preferred_model, supported_aspect_ratios text[] (subset of {`1:1`, `4:5`, `9:16`, `16:9`, `1.91:1`, `2:3`}), status: draft|published|archived, preview_s3_key?, requires_browser_render boolean, created_at)
- `stock_assets` (id, kind: icon|photo, s3_key, tags text[], embedding vector(1536), license, attribution, created_at)
- `price_book_entries` (id, model_code, size_bucket, premium_flag, credits, version, effective_from, effective_to?, created_at)

### 1.3 Platform formats (static reference)

A static, code-level (not DB) lookup table that maps social platform/format presets to canonical pixel dimensions and aspect ratio. Selecting a preset on the generation form pins these values into `generations.settings.output_target`. The list ships with the application; updates are deployed code changes (low churn — platform specs change yearly at most).

| Platform | Format | Aspect ratio | Dimensions (px) |
|---|---|---|---|
| Instagram | Post (square) | 1:1 | 1080×1080 |
| Instagram | Post (portrait) | 4:5 | 1080×1350 |
| Instagram | Story / Reel cover | 9:16 | 1080×1920 |
| Facebook | Feed post | 1.91:1 | 1200×630 |
| Facebook | Story | 9:16 | 1080×1920 |
| LinkedIn | Single image post | 1.91:1 | 1200×627 |
| LinkedIn | Square post | 1:1 | 1200×1200 |
| TikTok | Photo / Story | 9:16 | 1080×1920 |
| Pinterest | Pin | 2:3 | 1000×1500 |
| Pinterest | Story Pin | 9:16 | 1080×1920 |
| YouTube | Thumbnail | 16:9 | 1280×720 |
| X / Twitter | Single image | 16:9 | 1600×900 |

**"Just an image" mode** lets the user pick any aspect ratio in {1:1, 4:5, 9:16, 16:9} with a default size (longest edge 1024px on Standard, 1536px on Premium).

The platform formats table lives at `apps/web/lib/output-targets.ts` (or equivalent). When platform specs change, this is a code change + deploy.

### 1.4 Indexes (essentials)

- `brands(workspace_id, created_at desc)`
- `generations(workspace_id, created_at desc)`, `generations(status) where status in ('pending','running')`
- `generation_variants(generation_id)`
- `credit_ledger_entries(workspace_id, created_at desc)`, UNIQUE on `idempotency_key`, UNIQUE on `stripe_event_id` where not null
- `mood_template_bindings(mood_id)`, `mood_template_bindings(template_id)`
- `stock_assets USING ivfflat (embedding vector_cosine_ops)` — pgvector index
- `brand_assets USING ivfflat (embedding vector_cosine_ops)`

## 2. Multi-tenancy enforcement

Defense in depth at four layers. No single layer is trusted alone.

1. **App layer.** Clerk JWT carries `current_workspace_id` claim. API middleware extracts it, opens DB transaction, runs `SET LOCAL app.current_workspace_id = $1` before any query.
2. **DB layer.** Every tenant table has RLS:
   ```sql
   CREATE POLICY tenant_isolation ON brands
     USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
   ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
   ALTER TABLE brands FORCE ROW LEVEL SECURITY;
   ```
   App role `app_user` has RLS enforced. Admin role `app_admin` (used only by back-office Lambda) bypasses; admin queries always log to `audit_log`.
3. **Storage layer.** S3 paths prefixed `workspaces/{wid}/...`. Pre-signed URLs minted only after RLS-authorized DB lookup confirms ownership. Mint scope is the exact key, not the prefix.
4. **Audit.** Every cross-tenant-sensitive admin action recorded in `audit_log`. Append-only.

**Property test:** for N pairs of workspaces (A, B), set `app.current_workspace_id = A`, attempt to read every workspace-B row across all tenant tables. Must return zero rows in all attempts.

## 3. User flows

### 3.1 Sign up & first workspace

1. User clicks "Sign up", picks Google/Microsoft/Apple/email.
2. Clerk handles auth; on first session, Clerk webhook → app `clerk.user.created` handler:
   - Insert `users` row.
   - Create personal workspace (`plan_code='free'`, `brand_quota=1`, `seat_quota=1`, `monthly_credit_grant=30`).
   - Insert `workspace_members(role='owner')`.
   - Insert initial `credit_ledger_entries(kind='grant', amount=30)`.
   - Provision Stripe Customer (asynchronously via job; non-blocking for sign-up).
3. Redirect to onboarding: brand setup wizard.

### 3.2 Brand setup wizard

1. **Step 1 — Identify the brand.** Name + optional source URL.
   - If URL provided: fetch (SSRF-safe), extract `<title>`, dominant colors via image-color-extraction on largest image, candidate logos by `<link rel='icon'>` and `<img>` heuristics. Pre-fill subsequent steps.
2. **Step 2 — Logo.** Upload SVG/PNG (max 10MB). SVG sanitized via DOMPurify-svg (strip scripts, foreign-object, external refs). PNG re-encoded via sharp (strip EXIF). Rendered preview shown.
3. **Step 3 — Palette.** 3–5 colors. If logo is SVG, suggest palette from logo paint nodes. User can override.
4. **Step 4 — Fonts.** Two slots: heading + body. Pick from a curated Google Fonts list (50–100 high-quality families). Custom font upload deferred to v2.
5. **Step 5 — Voice notes.** Optional free-text describing tone. Used in caption generation and as soft prompt context.
6. **Step 6 — Reference images.** Optional. Upload up to 10 reference images. Stored as `brand_assets`, embedded for visual grounding.
7. Save → redirect to generation form.

### 3.3 Generate

1. User opens **New generation**. Form fields (in this order — output target first):
   - **Output target** (the framing decision):
     - Top-level: "For social" or "Just an image" (segmented control).
     - If "For social": platform + format chip (Instagram Post / Story / Portrait, Facebook Post / Story, LinkedIn Post / Square, TikTok, Pinterest Pin / Story Pin, YouTube Thumbnail, X Image). Selection pins `aspect_ratio + width + height` from the platform formats table (§ 1.3).
     - If "Just an image": user picks aspect ratio in {1:1, 4:5, 9:16, 16:9}; standard size pinned.
   - **Brief** (1–3 sentences, max 500 chars).
   - **Inspiration image** (optional). One JPG/PNG/WebP, max 10 MB. Per-generation only — does not modify the brand. If present, user also picks **Influence**: `subtle | balanced | strong`. Stored at `s3://.../workspaces/{wid}/generations/{gid}/inspiration.{ext}` and referenced via `generations.inspiration_image_s3_key`.
   - **Brand selector** (auto-selected if only one in workspace).
   - **Mood picker** (optional; visual grid grouped by Right Now / Always / Coming Soon; filtered to moods whose `supported_aspect_ratios` includes the currently selected output target's aspect ratio).
   - **Variant count** (default 4, capped at 4).
   - **Toggles panel**:
     - Use brand colors / logo / fonts (each independently toggleable; defaults all on).
     - Apply mood prompt modifiers / decorations / accent colors (defaults all on if mood selected).
     - Brand-strict mode (compound toggle — disables mood decorations + accent overlay; mood contributes to AI prompt only).
     - Premium model (Pro+ tier only; gates the gpt-image-1 path).
2. User clicks Generate.
3. API `POST /generations`:
   - Validate input (Zod schema). Validation includes:
     - `output_target.kind in ('social','image')`.
     - If `kind='social'`: `platform + format` resolves to a valid row in the platform formats table; `aspect_ratio + width + height` pulled from that row (server-side; never trust client-supplied dimensions).
     - If `kind='image'`: `aspect_ratio in {1:1, 4:5, 9:16, 16:9}`.
     - If `inspiration_image_upload_id` present: confirm upload exists, ownership belongs to caller, mime-sniffed image, ≤10 MB.
     - If `mood_id` present: `mood.supported_aspect_ratios` must include the resolved `aspect_ratio`. Otherwise 422 with suggested alternative.
   - Resolve template selection: from `mood_template_bindings` (if `mood_id`) or the fallback brand-only template pool, filtered by `aspect_ratio`, sorted by weight, take top N.
   - Compute estimated credit cost via `price_book_entries.find(model, size_bucket, premium_flag, has_inspiration)` for each chosen template. Snapshot the `price_book_version` onto `generations.price_book_version`.
   - Open transaction, `SET LOCAL app.current_workspace_id`, atomically reserve credits:
     ```sql
     INSERT INTO credit_ledger_entries (workspace_id, kind, amount, balance_after, idempotency_key)
     VALUES ($1, 'reservation', -$total, last_balance - $total, $key);
     ```
     Constraint: `balance_after >= 0`. Violation → 402 Insufficient Credits.
   - Insert `generations` (with `inspiration_image_s3_key`, `inspiration_influence`, `settings.output_target`, `price_book_version`) + N `generation_variants` (`status='queued'`).
   - Enqueue N SQS messages, each `{generation_id, variant_id, idempotency_key=variant_id}`.
   - Return `{generation_id, status: 'pending', variants: [{id, template_id, status: 'queued'}]}`.
4. Client redirected to `/generations/{id}`. Long-polls `GET /generations/{id}` every 1.5s until all variants terminal.
5. As variants complete, UI updates with thumbnails. User can pick favorites, edit headline text (re-renders inline via template renderer; free), regenerate single variant background (costs credits), download, copy URL.

### 3.3.1 Inspiration image upload endpoint

Upload happens before `POST /generations` so the form can show a thumbnail and the user can adjust influence without committing credits.

- `POST /uploads/inspiration` — multipart form with the image file.
  - Validates: mime-sniffed image, ≤10 MB, dimensions ≤8192×8192.
  - Re-encodes via sharp (strips EXIF, normalizes orientation, caps largest edge at 2048 px).
  - Stores at `s3://.../workspaces/{wid}/uploads/inspiration/{upload_id}.{ext}`.
  - Returns `{upload_id, s3_key, width, height}`.
  - Uploads not referenced by a generation are deleted by a daily cleanup job (TTL 24h).
- `POST /generations` references the upload via `inspiration_image_upload_id`. On reservation, the upload is "claimed" — moved to `generations/{gid}/inspiration.{ext}` and recorded in `generations.inspiration_image_s3_key`.

### 3.4 Worker pipeline (per variant)

1. SQS message arrives. Lambda handler invoked.
2. Idempotency check: `SELECT status FROM generation_variants WHERE id=$1`. If terminal, ack and exit.
3. Mark `running`. Set RLS context.
4. Build prompt and reference set:
   - Base: brief + template prompt scaffold + output_target (aspect_ratio + size).
   - **Brand grounding** (`role: 'brand_reference'`): top-3 `brand_assets` by embedding cosine similarity to brief (computed on-the-fly via Claude/OpenAI embedding API on the brief). Each carries a moderate weight (default 0.4).
   - **Inspiration image grounding** (`role: 'inspiration'`, only if `generations.inspiration_image_s3_key` present): single high-weight reference. Weight derived from `inspiration_influence`: `subtle=0.3`, `balanced=0.6`, `strong=0.9`.
   - **Reference precedence rule.** When both brand references and inspiration are present, the inspiration image's stylistic cues take precedence over brand references for **visual style** (lighting, composition, mood), while brand references dominate **subject identity** (product look, palette tendencies). The gateway enforces this via per-role weighting; providers that don't support multi-reference fall back to using only the highest-weight reference.
   - Mood layer: append `mood.prompt_modifiers`. Append `mood.negative_prompts` to negative prompt.
   - Text-safe-zone hint: translate template's `text_safe_zones` to negative-space instructions ("leave the upper-third of the frame visually quiet for headline overlay").
   - Brand-color hint: inject palette as ambient lighting / accent suggestion only — NOT as text colors. Real text colors applied at template stage.
5. Call AI Gateway with `{model_code, prompt, negative_prompt, references: [{s3_key, role, weight}], aspect_ratio, width, height}`. Gateway abstracts provider (Replicate/OpenAI/BFL/Bedrock). When `references` contains an inspiration image, the gateway prefers an image-to-image-capable provider for that variant; if the chosen `preferred_model` does not support image-to-image, the gateway either (a) routes that variant to the closest image-to-image-capable model in the same tier, or (b) falls back to text-only with the inspiration image converted to descriptive text via a vision model — whichever the provider strategy in arch § 4.3 dictates.
6. On model failure (timeout, 5xx): one retry same model → fallback to Bedrock SD 3.5 with reduced credit cost.
7. Store background → `s3://.../workspaces/{wid}/generations/{gid}/background-{vid}.png`.
8. Call Template Renderer (synchronous Lambda invoke):
   - Input: `{template_id, background_s3_key, brand: {logo_s3_key, palette, fonts}, mood: {accent_palette, decoration_tags, typography_hint}, slots: {headline, subhead, cta, decorations[]}, output_target: {aspect_ratio, width, height}}`. Renderer outputs at the exact pixel dimensions specified.
   - Renderer loads template JSX from `templates.jsx_source`, instantiates with values, loads brand fonts into Satori font registry, composes via Satori → SVG → Resvg → PNG, returns `{output_s3_key, render_ms}`.
   - Browser-render fallback: if `template.requires_browser_render`, route to Puppeteer Lambda (1024MB, 1–2s).
9. Commit credits in tx:
   ```sql
   INSERT INTO credit_ledger_entries (kind='commit', amount=-actual_cost, generation_id=$gid, idempotency_key=$key);
   ```
   If `actual_cost < estimated`, also insert `release` for the difference.
10. Update `generation_variants` to `completed`.
11. Atomic check whether all sibling variants terminal. If yes:
    ```sql
    UPDATE generations SET status='completed', completed_at=now()
    WHERE id=$1 AND NOT EXISTS (
      SELECT 1 FROM generation_variants
      WHERE generation_id=$1 AND status NOT IN ('completed','failed')
    );
    ```
    Insert any final `release` for unspent reservation.

### 3.5 Failure handling

- **Reservation fails (insufficient credits)** → API 402, no rows inserted, no SQS messages.
- **AI model 5xx or timeout** → retry once same model → fallback SD 3.5 (5 credits) → if both fail, mark variant `failed`, release that variant's reservation.
- **Template renderer crash** → retry once → if second fails, mark variant `failed`, release reservation.
- **SQS redrive after partial completion** → idempotency check terminates duplicate work.
- **All variants fail** → generation `failed`, full reservation released, no commits posted, user notified with retry prompt.
- **Partial success** → succeeded variants committed, failed ones' reservations released, user sees what worked.
- **Worker crash mid-flight** → SQS visibility timeout (60s) re-delivers; idempotency resumes.
- **Stripe webhook arrives during reservation** → both write to ledger as separate atomic entries. Balance is sum, never conflicting.
- **Dead-letter queue** → after 3 attempts, message → DLQ → Sentry alert + ops email.

### 3.6 Caption generation (separate task)

1. User clicks "Generate caption" on a completed generation, picks length tier (short/medium/long, 1/3/5 credits).
2. API `POST /captions`:
   - Reserve credits.
   - Insert `caption_jobs` row, enqueue SQS.
3. Worker calls Claude Haiku (cheap, fast) with `{brief, brand.voice_notes, length_tier}`.
4. Output stored in `caption_jobs.output_text`. UI shows result.

## 4. Mood system

### 4.1 Blending precedence (top wins on conflict)

| Layer | Source | Hard rule |
|---|---|---|
| Logo | Brand only | Mood cannot contribute logo content |
| Primary text color | Brand `palette.primary` | Mood accent never overrides |
| CTA / button color | Brand `palette.accent` (default) → Mood accent (if user toggle on) | User-controlled |
| Headline / body font | Brand `fonts.heading` / `fonts.body` | Mood may suggest weight/style variant within brand's family only |
| Background imagery | AI generation prompt: brief + mood modifiers + brand references | Both contribute; brand visual references win on visual similarity |
| Decorative motifs | Mood `decoration_tags` → stock assets | Brand cannot contribute decorations; user toggle gates this |
| Layout / template choice | Mood `template_binding` weights | Brand has no opinion |

### 4.2 User-facing toggles (right side panel of generation form)

```
Brand
  ☑ Use brand colors
  ☑ Use brand logo
  ☑ Use brand fonts
  ☐ Brand-strict mode  (mood contributes prompt only — no decorations or accent overlays)

Mood: Christmas
  ☑ Apply mood prompt modifiers (background scene)
  ☑ Apply mood decorative motifs (snowflakes, candles, etc.)
  ☑ Apply mood accent colors (to non-brand-critical elements only)
```

### 4.3 Validation at API ingress

- Output target resolution — `kind='social'` must resolve to a valid (platform, format) row in the platform formats table (§ 1.3); `kind='image'` must specify aspect_ratio in the supported set.
- Mood × aspect_ratio compatibility — `mood.supported_aspect_ratios` must include the resolved aspect ratio. Reject with 422 + suggested alternative moods.
- Mood validity check — past-`valid_to` rejected (admin override flag for testing).
- Brand-strict + mood-with-no-prompt-modifiers → soft warn ("This mood will have no visible effect in brand-strict mode").
- Inspiration image — if `inspiration_image_upload_id` provided, server confirms the upload exists, belongs to the caller, mime-sniffed image, ≤10 MB, and within 24h TTL.

## 5. Admin back-office

Separate Next.js route group `/admin/*`, gated by `users.role='admin'`. RLS-bypassed via `app_admin` DB role; every action writes to `audit_log`.

| Tool | Purpose |
|---|---|
| User & workspace search | Find by email / slug / Stripe customer ID |
| Ledger viewer | Per-workspace ledger entries, reconciliation status, manual grant button |
| Mood Studio | Author Moods (per Section 4 of brainstorm) |
| Template Studio | Author `templates` rows; preview render against synthetic brand |
| Stock library manager | Upload, tag, license stock assets |
| Price book editor | Versioned credit-cost rules; effective-dated |
| Generation inspector | Open any generation by ID; see prompt, model, render manifest, error payload; resume / re-run override |
| Provider override | Force fallback model for ongoing outages |
| AUP enforcement | Suspend, reset, ban workspace; list flagged generations |

## 6. Billing & credit ledger

### 6.1 Stripe integration points

- One workspace = one Stripe Customer.
- One subscription per workspace (active subscription has `status in ('trialing','active','past_due')`).
- Webhooks listened: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
- Every webhook handler is idempotent on Stripe event ID (`stripe_event_id` unique constraint on ledger).

### 6.2 Monthly grant flow

1. `invoice.paid` webhook → handler validates event signature.
2. Atomically: lookup workspace by `stripe_customer_id` → insert `credit_ledger_entries(kind='grant', amount=plan.monthly_credit_grant, stripe_event_id=evt.id)` → upsert `subscriptions` row.
3. Grant balance is logically tagged with period (`expires_at = current_period_end`). At period rollover, expired grant is consumed by an `adjustment` entry zeroing it. (Top-up entries never expire.)

### 6.3 PAYG top-up flow

1. User clicks pack → app creates Stripe Checkout Session (mode=payment, single line item).
2. `checkout.session.completed` webhook → insert `credit_ledger_entries(kind='topup', amount=pack.credits)`.
3. UI updates immediately on next poll.

### 6.4 Plan changes

- Upgrade: Stripe pro-rates → on `invoice.paid` for the prorated invoice, sync `subscriptions.plan_code` and grant difference.
- Downgrade: takes effect at period end (Stripe default). On rollover, new lower grant applies.

### 6.5 Dunning

- Stripe handles retry schedule (3 retries / 14d).
- After dunning fails, on `customer.subscription.updated` with `status='unpaid'` → app sets `workspaces.status='read_only'`. UI: cannot generate, can view past, can update payment method.

### 6.6 Refunds

- Support tool issues Stripe refund → on `charge.refunded` webhook, insert paired `refund` ledger entry (negative).
- Negative-balance refunds blocked unless admin override.

### 6.7 Reconciliation

- Daily job: per workspace, sum ledger entries vs expected = (sum of paid invoices' grants) + (sum of completed top-up sessions). Drift > 0 → Sentry alert + email to ops.

## 7. Security

| Risk | Control |
|---|---|
| Cross-tenant data leak | Postgres RLS + S3 prefix isolation + signed URLs scoped to exact key |
| Prompt injection via brief | Brief sandwiched as data between admin-authored system instructions; mood/voice content owner-trusted but encoded as data |
| Output moderation | Pre-gen: brief through OpenAI Moderation (or Bedrock Guardrails). Post-gen: optional NSFW classifier on image. Failure → variant `failed_safety`, credits released, brief flagged |
| Logo SVG XSS | DOMPurify-svg + svgo strict; strip scripts, foreign-object, external refs |
| Brand asset upload | sharp re-encode, EXIF strip, mime sniff, max 10 MB |
| URL extraction SSRF | Allowlist private IP ranges blocked; HTTPS-only; 5s timeout; max 5 MB body |
| Rate limiting | Per-user (10/min on Free, scaled by tier); per-workspace concurrent-generation cap; tracked in Postgres-backed counters or Upstash Redis if needed |
| Brute force / auth abuse | Clerk handles |
| API auth | Clerk JWT required on all routes; admin routes additionally require role check |
| Secrets | AWS Parameter Store SecureString in prod; `.env.local` (gitignored) in dev |
| AUP violations | Heuristic flagging on briefs (CSAM keywords, weapons, prohibited categories); auto-block + workspace flagged for review |

## 8. Errors

- Single `AppError` class: `{code, userMessage, httpStatus, details?}`. Codes namespaced (`auth.*`, `billing.*`, `generation.*`, `validation.*`, `safety.*`).
- API responses: `{error: {code, message, requestId}}`.
- Worker errors stored in `generations.error_payload` / `generation_variants.error_payload`.
- DLQ → Sentry + ops email after 3 attempts.

## 9. Testing strategy

| Tier | Coverage | When |
|---|---|---|
| Unit (Vitest) | Cost estimator, prompt builder, credit math, RLS helpers, validators. 80%+ on these. | Every CI run, <30s |
| Component (RTL + Vitest) | React components in isolation: generation form, mood picker, brand kit editor | Every CI run |
| Integration (Vitest against Docker Compose, `AI_MODE=mock`) | Full pipeline: API → SQS → worker → renderer → ledger. Multi-tenant RLS property test. | Every CI run, 2–4 min |
| E2E (Playwright, dev session bypass) | signup → brand setup → generate → download. Credit-exhaustion path. Top-up via `BILLING_MODE=stripe-test`. | Pre-merge to main |

**Manual pre-release checklist** includes:
- Visual review of all template renders against synthetic brands (no automated visual regression).
- Spot-check of new mood × template combinations.
- Stripe webhook fixture replay (live test mode).
- Migration applied to staging + manual validation.

**High-leverage tests:**
- Concurrent reservations on same workspace cannot push balance below zero (deterministic concurrency unit test).
- RLS holds: setting `app.current_workspace_id` to A returns zero rows for any workspace-B data across all tenant tables.
- Credit ledger sum = expected balance after random walk of 10k operations (property-based via fast-check).

## 10. Local development

Per architecture doc Section 6 — adapter pattern with env flags:

- `AUTH_MODE=clerk|dev`
- `QUEUE_MODE=sqs|elasticmq|inline`
- `STORAGE_MODE` controlled via `S3_ENDPOINT` (MinIO for local)
- `BILLING_MODE=stripe-live|stripe-test|stub`
- `AI_MODE=real|mock|record`
- `EMAIL_MODE=resend|mailpit|console`
- `OBSERVABILITY=sentry|none`

`make dev` boots full local stack with no cloud credentials.

## 11. Open implementation questions

- Drizzle vs Prisma — leaning Drizzle (tracked in arch doc).
- Long-poll vs SSE for generation status — long-poll v1, SSE upgrade trigger documented.
- Curated Google Fonts list — to be sourced before beta.
- Stock asset seed library — partner with Pexels / Unsplash API or curate manually for v1.
- Vision model used to convert inspiration image → descriptive text (for providers that don't support image-to-image): leaning Claude Sonnet 4.6 vision via Anthropic API (cheap, accurate). Final pick during impl.
