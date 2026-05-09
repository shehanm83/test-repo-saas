# Image Model Taxonomy & Pricebook Restructure — Design

**Date:** 2026-05-09
**Sub-project:** A (of A→B→C→D decomposition for the image-generation redesign)
**Status:** Approved by user; ready to hand off to `writing-plans`.

## 1. Goal & scope

Replace the single `premium_flag: bool` taxonomy with a normalized 4-dimension model:

- **Tier** (system-defined): `standard`, `premium`
- **Strength** (system-defined, extensible by admin): `text`, `photoreal`, `design`, `speed`, …
- **Display name per model** (admin-controlled): user-facing labels like "Photoreal Pro" — never expose LLM model identifiers
- **Tags** (admin-controlled, free-form): "Holiday 2026", "EU-only", "Beta", …

Plus two new behaviours:

- **Admin-controlled routing**: which model serves each (tier, strength) bucket is admin-configurable, not auto-scored
- **Multi-model variation**: when 2-3 models serve the same strength, the user can opt in to fan-out generation across N of them; credits scale ×N

This sub-project ships **DB schema, query helpers, admin API, and generation-API contract changes only**. Out of scope:

- Provider implementation / new model wiring (sub-project B)
- Quick Create UI rework (sub-project C)
- Manual crop tool (sub-project D)

Existing `usePremiumModel: bool` request shape keeps working via a backwards-compat translation for one release window so sub-project C can be built and shipped without forcing a flag day.

## 2. Schema

Seven tables. Six are new; `price_book_entries` is the only existing table changing.

```
quality_tiers                                             [NEW, lookup]
─────────────────────────
code                text  PK         'standard' | 'premium'
label               text             'Standard', 'Premium'
description         text
requires_strength   bool             false for standard, true for premium
sort_order          int

strengths                                                 [NEW, lookup, extensible]
─────────────────────────
code         text  PK                'text' | 'photoreal' | 'design' | 'speed' | …
label        text                    'Text rendering', 'Photoreal', …
description  text                    one-line UI hint ("Best at exact text in image")
icon         text  NULL              optional emoji/icon name for UI
sort_order   int
created_at   timestamptz default now()

models                                                    [NEW]
─────────────────────────
code            text  PK             'text-master', 'photoreal-pro', 'design-studio', 'economy'
display_name    text                 user-facing label, NEVER LLM model id
description     text                 marketing copy ("Best at sharp typographic text…")
vendor          text                 'openai' | 'replicate' | 'recraft' | 'bedrock' | 'google' | 'bfl'
llm_model_id    text                 the actual API model id ('gpt-image-2', 'flux-1.1-pro')
status          text  CHECK in ('active','paused','deprecated')  default 'active'
created_at      timestamptz
updated_at      timestamptz

model_strengths                                           [NEW, M×N]
─────────────────────────
model_code     text  FK→models.code      ON DELETE CASCADE
strength_code  text  FK→strengths.code   ON DELETE RESTRICT
PRIMARY KEY (model_code, strength_code)

tags                                                      [NEW, lookup]
─────────────────────────
code         text  PK
label        text
description  text  NULL
created_at   timestamptz

model_tags                                                [NEW, M×N]
─────────────────────────
model_code  text  FK→models.code   ON DELETE CASCADE
tag_code    text  FK→tags.code     ON DELETE CASCADE
PRIMARY KEY (model_code, tag_code)

tier_strength_routing                                     [NEW]
─────────────────────────
id               uuid  PK
tier_code        text  FK→quality_tiers.code   NOT NULL
strength_code    text  FK→strengths.code       NULL  (NULL = applies to standard tier)
model_code       text  FK→models.code          NOT NULL
is_default       bool  default false           (used when user picks a bucket without specifying a model)
sort_order       int                            (presentation order if user picks "compare across N")
version          int                            for audit
effective_from   timestamptz default now()
effective_to     timestamptz NULL
UNIQUE INDEX (tier_code, strength_code, model_code, version)
PARTIAL UNIQUE INDEX (tier_code, strength_code) WHERE is_default = true AND effective_to IS NULL
  -- enforces "exactly one default per (tier, strength) bucket at a time"

price_book_entries                                        [CHANGED]
─────────────────────────
-- DROP premium_flag (replaced by tier→model resolution); kept for one release as legacy/audit
-- KEEP model_code (FK now references models.code), size_bucket, has_inspiration_flag, credits
-- KEEP version, effective_from, effective_to (existing audit pattern)
-- ADD FK constraint on model_code → models.code
-- pricing is now per-model — tier/strength only affect which model gets routed,
--   not the price of a given model
```

The partial unique index on `tier_strength_routing` enforces *"exactly one default model per (tier, strength) bucket at any moment"* without blocking historical versions (since `effective_to` is set when superseded).

Multi-model variation lives at the **request level**, not in the schema:

```
generation_request.flags = { tier, strength?, selected_model_codes?: string[] }
```

- If `selected_model_codes` is empty/absent → use the `is_default` model in that bucket.
- If N codes are provided (typically 2–3, but no artificial cap — up to all eligible models in the bucket) → fan out N variants; total credits = Σ pricing(model, size, has_inspiration).
- All values must be members of `tier_strength_routing` for that bucket — the API rejects otherwise.
- Two distinct `models` rows MAY share the same `llm_model_id` (e.g., `economy` and `photoreal-pro` can both wrap `flux-1.1-pro` at different price points / display names). Uniqueness is on `models.code`, not on `llm_model_id`.

## 3. Read patterns & data flow

The taxonomy is read in three places. Each has a single query helper (no scattered SQL).

**A) Quick Create — present available choices to the user**

```
getTierOptions() → [
  { tier:'standard', model: <default model card> },
  { tier:'premium', strengths: [
      { strength:'text', defaultModel: <card>, alternativeModels: [<card>...] },
      { strength:'photoreal', ... }, ...
  ]}
]
```

Single SQL: `tier_strength_routing JOIN models JOIN model_strengths`, filtered by `models.status='active' AND effective_to IS NULL`.

**B) Generation submit — resolve picker selection to concrete models + price**

```
resolveSelection({ tier, strength?, selected_model_codes? })
  → { models: ModelRow[], totalCredits: number }
```

Steps:

1. Look up routing rows for `(tier, strength)` where `effective_to IS NULL`.
2. If `selected_model_codes` is empty → pick the row with `is_default=true`. Error 422 `no_default_model_for_bucket` if none.
3. If `selected_model_codes` is provided → validate each is in the routing. Error 422 `model_not_eligible` if any aren't.
4. For each chosen model, fetch active `price_book_entries` row by `(model_code, size_bucket, has_inspiration_flag)`. Error 422 `pricing_missing` if not found.
5. Total credits = Σ entry.credits.

**C) Worker — generate per variant**

The variant row carries `model_code` (set by `resolveSelection`). The worker calls `gateway.generate({ modelCode: model.llm_model_id, ... })` — the LLM model id is dereferenced via `getModel(model_code)` at the seam between API and gateway. The user-facing `display_name` is fetched the same way for the Result page.

**Backwards compatibility**

- Existing `usePremiumModel: bool` requests → if `true`, set `tier='premium'` with `strength=null` and use the bucket's default model. If `false`, `tier='standard'`. The `/api/generations` route accepts both shapes for one release.
- **Precedence when both shapes present in the same request**: explicit `tier` wins; `usePremiumModel` is ignored. The API logs a structured warning so we can spot client code that needs updating.
- Existing variant rows (pre-migration) keep their `model_used` text value. The new `models.code` PK is namespaced separately so old data isn't backfilled. New variants store `model_code` referencing `models.code`.

## 4. Migration

One Drizzle migration `0016_image_model_taxonomy.sql`. Order matters because of FKs.

1. `CREATE TABLE` for the seven new tables.
2. **Seed `quality_tiers`**:
   - `('standard', 'Standard',  'Single default model — fast & affordable',  false, 0)`
   - `('premium',  'Premium',   'Pick a model strength for the result',      true,  1)`
3. **Seed `strengths`**:
   - `('text',      'Text rendering',      'Best at exact text/typography in image', 0)`
   - `('photoreal', 'Photoreal',           'Photographic realism',                    1)`
   - `('design',    'Design / Typographic','Editorial, poster, vector-feel',          2)`
   - `('speed',     'Speed / Iteration',   'Fast cheap drafts',                       3)`
4. **Seed initial `models`** (sub-project B refines; A starts with the four already wired in code):
   - `code='economy'        vendor='replicate' llm='flux-1.1-pro'  display='Economy'`
   - `code='photoreal-pro'  vendor='replicate' llm='flux-1.1-pro'  display='Photoreal Pro'`
   - `code='text-master'    vendor='openai'    llm='gpt-image-1'   display='Text Master'`
   - `code='design-studio'  vendor='recraft'   llm='recraft-v3'    display='Design Studio'`
   - `code='speed-draft'    vendor='bedrock'   llm='bedrock-sd35'  display='Speed Draft'`

   Initial `llm_model_id` for `text-master` is `gpt-image-1` (not `gpt-image-2`) because the latter is currently org-verification-blocked; admin can flip to `gpt-image-2` in the `models` row once verified, no migration needed.

5. **Seed `model_strengths`**: `text-master→text`, `photoreal-pro→photoreal`, `design-studio→design`, `speed-draft→speed`. (`economy` has no strength — it's the standard-tier default.)
6. **Seed `tier_strength_routing`** (`is_default=true` for each):
   - `standard / null            → economy`
   - `premium  / text             → text-master`
   - `premium  / photoreal        → photoreal-pro`
   - `premium  / design           → design-studio`
   - `premium  / speed            → speed-draft`
7. **Backfill** existing 78 `price_book_entries` rows **before** adding the FK constraint. They are keyed on `llm_model_id` strings (`'flux-1.1-pro'`, `'gpt-image-1'`, etc.). Update `model_code` in place to point at the new `model.code`:
   - `premium_flag=true  AND model_code='flux-1.1-pro'  → 'photoreal-pro'`
   - `premium_flag=false AND model_code='flux-1.1-pro'  → 'economy'`
   - `model_code IN ('gpt-image-1','gpt-image-2')        → 'text-master'`
   - `model_code='recraft-v3'                             → 'design-studio'`
   - `model_code IN ('bedrock-sd35','nova-canvas')        → 'speed-draft'`
8. **`ALTER price_book_entries`** (after backfill):
   - Add FK constraint `model_code → models.code`.
   - **Keep** `premium_flag` column for one release as legacy/audit; new code stops reading it. Drop in a follow-up migration after sub-project C ships.
9. Update `packages/db/scripts/seed-pricebook.ts` to insert by `model_code` matching the new `models.code` values. The script remains idempotent via `onConflictDoNothing`. Re-run after the migration as a safety net.

**Reversibility**: forward-safe but deliberately not fully reversible — sub-project A is a one-way structural shift. The legacy `premium_flag` column staying in the table for one release gives an escape hatch; rollback drops the new tables and restores `premium_flag` reads in code.

## 5. Error handling

The new request paths surface five named error codes, all returned as `422 Unprocessable Entity` from `/api/generations` and any preflight estimate endpoint. Each is a `ZodError`-style structured payload, never a 500.

| Code | Trigger | Client action |
|---|---|---|
| `tier_unknown` | `tier` not in `quality_tiers` | Refresh the picker (admin removed the tier) |
| `strength_unknown` | `strength` not in `strengths`, or `tier='standard'` with a strength | Refresh the picker |
| `no_default_model_for_bucket` | `(tier, strength)` routing has no `is_default=true` row | Admin error — surface in admin UI as "needs a default" badge; user gets a graceful "this option is temporarily unavailable" |
| `model_not_eligible` | A code in `selected_model_codes` isn't in this bucket's routing | Refresh the picker |
| `pricing_missing` | No active `price_book_entries` for the resolved `(model, size, has_inspiration)` | Admin error — same "temporarily unavailable" surfacing |

Two invariants enforced by the DB rather than code:

- Partial unique index `(tier_code, strength_code) WHERE is_default = true AND effective_to IS NULL` — stops admins from setting two defaults in the same bucket.
- FK `price_book_entries.model_code → models.code` — stops orphaned price rows.

**Multi-model variation failure semantics** keep the existing per-variant model:

A generation with 3 models fans out 3 variants. Each variant retries up to N times against its own model. If one model fails permanently (e.g., a provider 403 like today's `gpt-image-2` org-verification block), only its variants fail; the other models' variants still complete. **Credits already debited for the failed variants get refunded** via the existing refund-on-variant-failure path in `packages/billing/src/refund.ts` — no change needed.

## 6. Testing

Standard layout for this codebase: unit tests next to the code, integration tests with `.int.test.ts` suffix that hit the live Postgres in compose. No new test infrastructure.

```
packages/db/src/queries/taxonomy.test.ts          [unit]
  - getTierOptions returns active models only, sorted by sort_order
  - getTierOptions excludes status='paused' and 'deprecated' models
  - getTierOptions excludes routing rows with effective_to set
  - resolveSelection (default path): picks is_default=true model
  - resolveSelection (multi-model): validates each code, sums credits
  - resolveSelection error cases: each of the five 422 codes
  - getModel by code (for Result page display_name lookup)

packages/db/src/queries/taxonomy.int.test.ts      [integration]
  - Migration applies cleanly; seed data is correct
  - Partial unique index blocks two is_default=true in same bucket
  - FK on price_book_entries.model_code → models.code rejects orphans
  - Backfill rule: existing premium_flag=true flux row → model_code='photoreal-pro'

packages/api/src/generation.test.ts               [existing, extended]
  - usePremiumModel=true legacy path still resolves to premium tier
  - New {tier, strength} path resolves to the same model when matched
  - selected_model_codes path validates eligibility, computes total credits

apps/web/app/api/admin/taxonomy/*.test.ts         [new admin endpoints]
  - CRUD on tiers, strengths, models, tags, model_tags, model_strengths,
    tier_strength_routing
  - Setting is_default=true on a row clears it on the prior default in the
    same bucket (single transaction)
```

What's **not** tested in this sub-project:

- Provider implementation (sub-project B's tests cover that).
- Quick Create UI (sub-project C).
- The full end-to-end "user picks Premium-Text → image renders" flow — that requires both B (a working provider for that model) and C (a UI to send the new request shape). Sub-project A's contract test stops at "API returns the right shape and pricing for a known taxonomy".

## 7. Admin UI

The taxonomy is admin-managed. A taxonomy without an ergonomic management surface forces SQL edits — unacceptable. Sub-project A ships these screens.

Existing convention (`apps/web/app/admin/moods`, `/pricebook`, `/templates`): server-side `page.tsx` fetches via an API class, renders a client component from `apps/web/components/admin/`. New screens follow the same pattern.

### 7.1 Screens

**`/admin/models`** — primary management screen
- Table columns: `code`, `display_name`, `vendor`, `llm_model_id`, `status`, strengths (chips), tags (chips), buckets where default (chips).
- Filters: vendor, status, strength, tag.
- "New model" button → form (code, display_name, description, vendor, llm_model_id, status).
- Row click → `/admin/models/[code]`.

**`/admin/models/[code]`** — model detail
- Inline edit fields above.
- Strengths section: multi-select of existing strengths; pivot writes to `model_strengths`.
- Tags section: multi-select with autocomplete; can create a new tag inline (writes to `tags` then `model_tags`).
- Routing section (read-only here): which `(tier, strength)` buckets this model is assigned to, with default badge if applicable. Edits happen in `/admin/routing`.
- Danger zone: status changes to `paused` or `deprecated`. Deletion only allowed if no `tier_strength_routing` rows reference the model and no active `price_book_entries` exist.

**`/admin/strengths`** — strength catalog
- Low-frequency screen. Table with code, label, description, icon, sort_order.
- "New strength" form. Edit/delete inline. Deletion blocked if any `model_strengths` reference exists (FK `ON DELETE RESTRICT` enforces this in the DB; UI surfaces a clear "in use by N models" message).

**`/admin/tags`** — tag catalog
- Same shape as strengths. Tags are deletable (`ON DELETE CASCADE` removes their `model_tags` rows).
- Tags can also be created inline from `/admin/models/[code]`; this screen exists for bulk management and renames.

**`/admin/routing`** — bucket management (most consequential admin screen)
- Top-level list: one row per `(tier, strength)` bucket (e.g., "Premium · Photoreal"). Each row shows the assigned models in `sort_order`, with the default highlighted.
- "Standard" tier shows once (no strength sub-axis).
- Click a bucket → side panel with assignable models (multi-add), the eligible list (with drag-to-reorder for `sort_order`), and a "Set as default" radio per row.
- Setting `is_default=true` on one model in a bucket clears it on the prior default in **the same transaction** (server-side; the partial unique index would otherwise reject). UI shows a transient toast confirming the swap.
- Deactivating the only `is_default` for a bucket surfaces a warning ("this bucket has no default — picks in this bucket will fail") but doesn't block — admin can resolve by promoting another model.

**`/admin/pricebook`** *(existing screen, updated)*
- Existing list keeps its columns; the model column now renders `display_name (code)` from `models.code`.
- Edit form replaces the freeform `model_code` text input with a `<select>` populated from active `models`.
- The `premium_flag` column becomes read-only (`true` for legacy rows, hidden for new rows) during the one-release transition window. Drop entirely in the follow-up migration.

### 7.2 API endpoints

All under `/api/admin/taxonomy/` (new namespace), gated by the existing admin role check (`role === 'admin'` from `getSessionWorkspace`). Each resource gets a route module pair:

```
/api/admin/taxonomy/strengths/route.ts            GET, POST
/api/admin/taxonomy/strengths/[code]/route.ts     GET, PUT, DELETE
/api/admin/taxonomy/models/route.ts               GET, POST
/api/admin/taxonomy/models/[code]/route.ts        GET, PUT, DELETE
/api/admin/taxonomy/models/[code]/strengths/route.ts   POST, DELETE   (assign/unassign)
/api/admin/taxonomy/models/[code]/tags/route.ts        POST, DELETE
/api/admin/taxonomy/tags/route.ts                 GET, POST
/api/admin/taxonomy/tags/[code]/route.ts          GET, PUT, DELETE
/api/admin/taxonomy/routing/route.ts              GET, POST            (list buckets; POST adds a model to a bucket)
/api/admin/taxonomy/routing/[id]/route.ts         PUT, DELETE
```

**Routing PUT payload** (`/api/admin/taxonomy/routing/[id]`): `{ is_default?: boolean, sort_order?: number }`. When `is_default=true`, the handler runs in a single transaction: (a) clears `is_default` on any other row in the same `(tier_code, strength_code)` bucket whose `effective_to IS NULL`, then (b) sets `is_default=true` on this row. The partial unique index is the safety net if the transaction is bypassed.

`quality_tiers` has no admin endpoints — it's a static lookup table seeded by the migration. Adding a new tier is a code-and-migration change, not a runtime admin action. (`requires_strength` is a structural concern, not a configuration one.)

`/api/admin/pricebook` (existing) keeps its surface; the request validator switches from `premium_flag` to validating that `model_code` references an active `models.code`.

### 7.3 Components & state

```
apps/web/components/admin/
├── models-admin.tsx              list + filters
├── model-detail.tsx              [code] page client
├── strengths-admin.tsx
├── tags-admin.tsx
├── routing-admin.tsx             top-level list of buckets
├── routing-bucket-panel.tsx      side panel for one (tier, strength) bucket
└── pricebook-admin.tsx           (existing, edited)
```

State management follows existing patterns: server components fetch initial data, client components own form state, mutations go through `fetch('/api/admin/taxonomy/…')` then `router.refresh()` to re-fetch.

### 7.4 Tests

```
packages/api/src/taxonomy.test.ts                      [new]
  - List/create/update/delete for strengths, models, tags
  - assignStrength / removeStrength on a model
  - assignTag / createInlineTagAndAssign
  - Setting is_default=true clears prior default in same bucket (single tx)
  - Pricebook validation: rejects inactive model_code
  - quality_tiers is read-only (no admin CRUD endpoints exist)

apps/web/app/api/admin/taxonomy/**/*.test.ts           [new, route tests]
  - Auth: non-admin returns 403
  - Each route's happy path + one validation error path

apps/web/components/admin/*-admin.test.tsx             [new, RTL render tests]
  - Initial render with seeded data
  - Form submit calls the right endpoint with the right payload
  - Inline tag creation flow (create + assign in one action)
```

E2E tests are deferred to sub-project C (where the user-facing flow exists end-to-end).

## 8. Out of scope (reminders)

- **Sub-project B**: Provider research + wiring for new vendors (Google Nano Banana family, BFL direct, additional OpenAI variants). New providers will register their own `models` rows via seed scripts.
- **Sub-project C**: Quick Create UI rework — use-case-first picker (Facebook Landscape, IG Story, …), tier/strength chips, resolution picker driven by chosen model's *exact* supported sizes. Will consume `getTierOptions()` from this sub-project.
- **Sub-project D**: Manual crop tool — react-image-crop overlay, recompose endpoint.
