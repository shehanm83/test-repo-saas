# Image Providers Research & Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Each task is sized for one focused subagent run; do not split further.

**Goal:** Validate the provider matrix in the spec, add a `model_supported_sizes` table + admin override, wire the missing provider classes (BFL direct, Google image family), seed the new `models` + sizes, and move the `models.code → llm_model_id` dereference from the worker into the gateway boundary.

**Spec:** `docs/superpowers/specs/2026-05-09-image-providers-research-and-wiring-design.md`
**Architecture:** Each new provider class follows the existing pattern in `packages/gateway/src/providers/*.ts` (`capabilities`, `generate`). Schema additions live in `packages/db/src/schema/taxonomy.ts` next to A's tables. Gateway exposes `getSupportedSizes`. Worker (T9 of A) gets simplified — passes internal code, gateway resolves.

**Tech stack:** TypeScript · Drizzle · Vitest fixtures (record mode) · BFL REST API · Google AI Studio / Vertex AI · OpenAI SDK (existing) · Recraft REST (existing) · AWS Bedrock SDK (existing).

**Tasks: 4 total.**

---

## Task B1: Schema for supported sizes + admin migration + seed for existing 5 models

**Files:**
- Modify: `packages/db/src/schema/taxonomy.ts` (append `modelSupportedSizes`; add `allowCustomSize` to `models`)
- Create: `packages/db/src/migrations/0017_model_supported_sizes.sql`
- Modify: `packages/db/src/migrations/meta/_journal.json` (idx 16)
- Modify: `packages/db/src/queries/taxonomy.ts` (add `listSupportedSizes(db, modelCode)`)

Drizzle schema addition:
```typescript
export const modelSupportedSizes = pgTable(
  "model_supported_sizes",
  {
    modelCode: text("model_code").notNull().references(() => models.code, { onDelete: "cascade" }),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    label: text("label"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    pk: uniqueIndex("model_supported_sizes_pk").on(table.modelCode, table.width, table.height),
  }),
);

// Add to existing models table definition:
//   allowCustomSize: boolean("allow_custom_size").notNull().default(false),
```

Migration SQL — create the table + add the column + seed sizes for the five models seeded in A's migration 0016. Sizes per the spec matrix row for each:
- `economy`, `photoreal-pro`: 1024×1024 (square), 1024×1536 (portrait), 1536×1024 (landscape)
- `text-master`: 1024×1024, 1024×1536, 1536×1024
- `design-studio`: 1024×1024, 1024×1707, 1707×1024
- `speed-draft`: 1024×1024, 1024×1536, 1536×1024

Set `allow_custom_size = true` only for `economy` and `photoreal-pro` (Flux) since BFL accepts custom W×H.

Add `listSupportedSizes(db, modelCode)` returning rows ordered by `sort_order`. Add an integration test asserting all 5 seeded models have ≥3 sizes and the FK cascades on model delete.

Apply the migration via `pnpm db:migrate`. Verify counts in psql. Commit:
```
git commit -m "feat(db): model_supported_sizes table + seed for existing 5 models"
```

Verify: `pnpm --filter @vyora/db typecheck` and the new integration test pass.

---

## Task B2: Validate provider matrix + implement BFL and Google image providers + seed new models

**Files:**
- Create: `packages/gateway/src/providers/bfl.ts`
- Create: `packages/gateway/src/providers/google-image.ts`
- Create: `packages/gateway/src/providers/bfl.test.ts`
- Create: `packages/gateway/src/providers/google-image.test.ts`
- Modify: `packages/gateway/src/index.ts` (export new providers)
- Modify: `packages/shared/src/config.ts` (add `GOOGLE_GENAI_API_KEY` env var; refinement: required when AI_MODE=real and any google-* model is in routing)
- Create: `packages/db/src/migrations/0018_seed_new_image_models.sql` (data-only)
- Modify: `packages/db/src/migrations/meta/_journal.json` (idx 17)

Before writing code, **validate the matrix**:
- Use `WebFetch` against `https://docs.bfl.ml`, `https://ai.google.dev/gemini-api/docs/image-generation`, and Vertex AI Imagen docs.
- Confirm exact model ids, supported sizes, request shapes (especially polling vs. sync).
- If any "verify" entry doesn't match what the docs say (e.g., model id changed, sizes different, "Nano Banana" codename never went GA), update the matrix in the spec doc and proceed with what's actually available. Don't invent a model.

**BFL provider** (`bfl.ts`): async create-and-poll. POST `/v1/flux-pro-1.1` returns a job id; GET `/v1/get_result?id=<job>` polls until status `Ready`. Unwrap base64 from `result.sample`. Capabilities `modelCodes: ["photoreal-pro", "photoreal-ultra"]` (the latter only if `flux-pro-1.1-ultra` exists per docs). Tests: mock fetch, verify request shape + base64 decode + error mapping.

**Google image provider** (`google-image.ts`): the simpler path is the Gemini API at `generativelanguage.googleapis.com/v1beta/models/<id>:generateContent` with `responseModalities: ["IMAGE"]`. One class handles `gemini-2.5-image-preview` and any verified Pro/Ultra siblings. Capabilities `modelCodes: ["nano-banana", "nano-banana-pro"]` (only the ones that exist after validation). Tests as above.

**Migration `0018_seed_new_image_models.sql`** (data only):
- Insert any new `models` rows for the matrix entries that survived validation (proposed: `text-master-pro`, `nano-banana`, `nano-banana-pro`, `photoreal-ultra`, `imagen-3`, `nova-canvas` if not present)
- Insert their `model_strengths` mappings (each model should have at least one strength tag matching its "Best for" column)
- Insert their `model_supported_sizes` rows
- **Do NOT touch `tier_strength_routing`** — admins promote new models into buckets through the admin UI from sub-project A. Routing changes are a runtime decision, not a migration one.

Run migrations, run gateway test suite. Commit:
```
git commit -m "feat(gateway): BFL + Google image providers; seed models for new vendors"
```

Verify: `pnpm --filter @vyora/gateway test` green; `psql -c "SELECT code FROM models WHERE created_at > '2026-05-09'"` lists the new entries.

---

## Task B3: Move llm_model_id dereference into the gateway; add getSupportedSizes; rewire web UI lookups

**Files:**
- Modify: `packages/gateway/src/gateway.ts` (accept `models.code` in `generate()`; resolve to llm id internally; add `getSupportedSizes`)
- Modify: `apps/worker/src/handler.ts` (drop the T9 `getModel(...).llmModelId` line — pass `variant.modelUsed` directly)
- Modify: `apps/web/components/admin/model-detail.tsx` (display supported sizes section)
- Modify: `packages/api/src/taxonomy.ts` (expose `listSupportedSizes`)

The gateway becomes the single seam between *internal model codes* and *vendor llm ids*. Inject a `getModel` callback when constructing the gateway in `apps/worker/scripts/dev.ts` (and the test wiring) so the gateway can do the lookup. Worker stops touching the DB for model resolution.

The `Gateway.generate({ modelCode })` argument now expects `models.code` (e.g. `photoreal-pro`). The gateway resolves internally, calls the appropriate provider with the vendor llm id, and returns the response. **Update T9's worker so the variant's stored `modelUsed` stays as `models.code` even after success** — that fixes the regenerate-variant gap T9 flagged.

`Gateway.getSupportedSizes(modelCode)` reads from the new table via the injected db handle; cache the result for 60 seconds since admin edits are infrequent.

The model detail page (T16 of A) gains a "Supported sizes" section showing rows from `listSupportedSizes(modelCode)` with width × height labels. Read-only for now; admin edits this table is left to a follow-up since it's only seeded by migrations in v1.

Run web typecheck + worker tests. Commit:
```
git commit -m "feat(gateway): canonical model.code → llm_model_id resolution; getSupportedSizes"
```

Verify: regenerate-variant flow no longer hits pricebook lookup miss (smoke via tsx script that calls `regenerateVariant` against the real DB).

---

## Task B4: Record-mode integration smoke for each newly-wired provider + final docs

**Files:**
- Create: `apps/web/tests/__fixtures__/ai/bfl/` (record-mode captures)
- Create: `apps/web/tests/__fixtures__/ai/google-image/`
- Modify: `docs/PRODUCTION_GAPS.md` (mark B-related items resolved: B3/B5 — BFL provider missing, model identifiers in env)
- Create: `docs/superpowers/specs/2026-05-09-image-providers-research-and-wiring-design.md` annotation: append a `## 8. Validated matrix (post-implementation)` section reflecting what actually shipped vs. the original "verify" entries.

For each new provider, run a single end-to-end generation via tsx (one image per provider, smallest size, simplest prompt) with `AI_MODE=record` and the appropriate API key in `.env.local`. The fixtures land under `tests/__fixtures__/ai/<provider>/<test-name>.json` so future test runs can replay without burning credits.

If a provider key isn't available locally, the implementer skips that provider's recording and notes it in the report. The plan does not block on missing credentials.

Run a final smoke that exercises each `models.code` end-to-end: enqueue a generation through the public API (with `tier=premium, strength=<strength>, selectedModelCodes=[<code>]`), wait for the worker to complete, verify the variant lands with the right `model_used` and a non-null `output_s3_key`. This is the test the user manually clicked through during sub-project A but couldn't because gpt-image-2 was the default — now exercises the full new matrix.

Commit (single combined commit for the fixtures + docs):
```
git commit -m "feat(gateway): record-mode fixtures for BFL/Google; gap doc + validated matrix"
```

Verify: `pnpm test` green across the workspace; `docs/PRODUCTION_GAPS.md` no longer flags B3/B5; `git log master..HEAD` shows 4 commits for sub-project B.

---

## What's NOT in this plan

- Custom-size resolution picker (UI surfaces `allow_custom_size = true` only; the actual picker is in C)
- Removing `models.code` aliasing where two internal codes share the same llm id (`economy` and `photoreal-pro` both use `flux-1.1-pro` today) — that's an admin/business decision, not a B problem
- Caption / Anthropic / OpenAI text providers — out of scope
