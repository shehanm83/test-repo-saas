# Image Provider Research & Wiring — Design (Sub-project B)

**Date:** 2026-05-09
**Sub-project:** B (depends on A: image model taxonomy)
**Goal:** Survey the current state of image-generation models from major providers, decide which to support in v1, implement any missing provider classes, and seed the `models` rows that will be selected via Sub-project A's tier/strength routing.

## 1. Scope

In:
- Provider research (the actual matrix below)
- New `model_supported_sizes` table — admins need to know which pixel sizes each model accepts so the C UI can offer them
- Provider implementations for any model surfaced by the research that has no class yet (BFL direct, Google image)
- Seed `models` rows (and their strength assignments + routing) for the supported set
- Update `Gateway` to expose a `getSupportedSizes(modelCode)` lookup and to canonicalise `models.code → llmModelId` resolution at the gateway boundary (T9's worker-side dereference moves down)
- Sanity smoke that each wired provider actually returns a non-error response in `AI_MODE=record` mode

Out:
- Quick Create UI changes (sub-project C)
- Manual crop tool (sub-project D)
- Pricing changes — pricebook is already keyed on model_code from A; B can `INSERT` rows for new models but doesn't restructure the pricing schema
- Caption/text providers (Anthropic) — only image providers are in scope here

## 2. Provider research findings

The matrix below is what the implementer should validate against current vendor docs at task start. Anything marked `verify` should be confirmed with `WebFetch` against the vendor's API reference page before being wired.

| Vendor | Model id (vendor) | Internal `models.code` (proposed) | Display name | Best for | Native sizes (W×H) | API surface |
|---|---|---|---|---|---|---|
| OpenAI | `gpt-image-1` | `text-master` (already seeded in A) | "Text Master" | Text rendering, multi-ref editing | 1024×1024, 1024×1536, 1536×1024 | `images.generate` + `images.edit`; quality `medium`/`high` |
| OpenAI | `gpt-image-2` (verify) | `text-master-pro` | "Text Master Pro" | Text rendering at higher fidelity (org-verification required) | same as gpt-image-1 (verify) | same |
| Google | `imagen-3.0-generate-002` (verify) | `imagen-3` | "Imagen 3" | Photoreal alternative | 1024×1024, 1024×1408, 1408×1024 (verify) | Vertex AI `imagen-3:generate` REST or `@google/genai` SDK |
| Google | `gemini-2.5-image-preview` (verify "Nano Banana" codename) | `nano-banana` | "Nano Banana" | Speed/Iteration + decent text | 1024×1024 (and 1024×1536 in late variants — verify) | `generativelanguage.googleapis.com` |
| Google | `gemini-2.5-image-pro` (verify "Nano Banana Pro") | `nano-banana-pro` | "Nano Banana Pro" | Photoreal + text combo | verify | same |
| BFL | `flux-pro-1.1` | `photoreal-pro` (already seeded in A — currently maps to Replicate-hosted Flux) | "Photoreal Pro" | Photoreal | 1024–1440 each axis, custom WxH | `api.bfl.ml/v1/flux-pro-1.1` async create + poll |
| BFL | `flux-pro-1.1-ultra` (verify) | `photoreal-ultra` | "Photoreal Ultra" | Higher-fidelity photoreal | up to 2048 (verify) | same |
| Replicate | `black-forest-labs/flux-1.1-pro` | `economy` (A's standard tier default; same llm as photoreal-pro but cheaper Replicate hosting) | "Economy" | Standard tier default | matches BFL native | Replicate predictions |
| Recraft | `recraftv3` | `design-studio` (already seeded in A) | "Design Studio" | Design / typographic | 1024×1024, 1024×1707, 1707×1024 (verify) | Recraft REST `images/generations` |
| AWS Bedrock | `stability.stable-diffusion-3.5-large-v1:0` | `speed-draft` (already seeded in A — fast/cheap fallback) | "Speed Draft" | Fast cheap drafts (also v1's mandated fallback per § 4 of original spec) | 1024×1024 base, 1.5:1, 9:16 etc. | Bedrock `InvokeModel` |
| AWS Bedrock | `amazon.nova-canvas-v1:0` | `nova-canvas` | "Nova Canvas" | Photoreal on AWS | 1024×1024 base | Bedrock `InvokeModel` |

Vendors deliberately excluded for v1: Stability direct, Midjourney (no public API), Adobe Firefly (gated), Ideogram. Add later via the same pattern.

## 3. Schema changes

One new table:

```
model_supported_sizes                                     [NEW]
─────────────────────────
model_code   text  NOT NULL  REFERENCES models.code  ON DELETE CASCADE
width        int   NOT NULL  CHECK > 0
height       int   NOT NULL  CHECK > 0
label        text  NULL      e.g., "Square", "Portrait", "Landscape"
sort_order   int   NOT NULL  DEFAULT 0
PRIMARY KEY (model_code, width, height)
RLS: admin-write, user-read (matches A's lookup tables)
```

Optional admin override flag:

- `models.allow_custom_size boolean NOT NULL DEFAULT false` — set true for providers that accept arbitrary W×H within a min/max (BFL Flux). C's resolution picker will surface a custom-size input when this is set on the chosen model.

## 4. Gateway changes

Three changes to `packages/gateway`:

1. **`Gateway.getSupportedSizes(modelCode: string): Promise<Array<{width:number; height:number; label?:string}>>`** — reads from `model_supported_sizes`. Used by C's UI; not invoked at generation time.

2. **`Gateway.generate({ modelCode })` accepts internal model.code**, dereferences to llm id internally. T9 currently does the dereference in the worker handler; move it down so the worker just passes the internal code. Less surface area for the bug T9 flagged where the worker overwrites `modelUsed` with the LLM id on success.

3. **New providers** under `packages/gateway/src/providers/`:
   - `bfl.ts` — BFL Flux 1.1 Pro / Ultra direct (currently missing despite docs reference)
   - `google-image.ts` — Imagen 3 + Gemini 2.5 Image family (one class with model-routing inside, since they share auth)

Each provider's `capabilities.modelCodes` lists the *internal* codes it serves (not llm ids), so the gateway can pick by `models.code` directly.

## 5. Out of scope

- Picking which `nano-banana-pro` is the right default for Premium · Photoreal vs. keeping `photoreal-pro` (BFL Flux) — admins decide via routing UI from A
- BFL `--ultra` variants for custom resolution > 1440 — defer to post-launch
- Replacing `Replicate` Flux with `BFL` Flux for `economy` — kept Replicate for Economy because it's cheaper per call

## 6. Migration & deploy

- Migration `0017_model_supported_sizes.sql` adds the table + seeds for the 5 already-active models (sizes from row 1 of the matrix above)
- Migration also seeds *new* `models` rows + their strengths + routing for any new vendor we wire
- Existing `effective_to`-based routing audit pattern is reused; default models per bucket are NOT changed by B (admins must promote new models explicitly via the routing UI)

## 7. Verification

- New providers tested in `AI_MODE=record` mode against fixtures saved to `apps/web/tests/__fixtures__/ai/<provider>/`
- `Gateway.getSupportedSizes` integration test against seeded data
- Smoke: end-to-end generation with each newly-wired model_code (one image per, gated on real API keys being present in the running env — skipped otherwise)

## 8. Validated matrix (post-implementation)

Implementer notes from B2 — what actually shipped vs. the original "verify" entries in § 2:

| internal code | llm_model_id (validated) | Notes |
|---|---|---|
| `economy` | `flux-1.1-pro` | Unchanged. Stays on Replicate per § 5. |
| `photoreal-pro` | `flux-1.1-pro` | Unchanged. Routing still points at Replicate. BFL-direct provider is wired and registered for the same internal code; admins can swap via routing UI. |
| `photoreal-ultra` | `flux-pro-1.1-ultra` | New. BFL direct. Up to 4MP. `allow_custom_size = true`. |
| `text-master` | `gpt-image-1` | Unchanged. |
| `text-master-pro` | `gpt-image-2` | New. Same OpenAI provider class, dispatched by internal code. **Pending real-key smoke** — D5 in PRODUCTION_GAPS.md. |
| `nano-banana` | `gemini-2.5-flash-image` | Original spec proposed `gemini-2.5-image-preview` — that id never went GA. The shipping name is `gemini-2.5-flash-image`. |
| `nano-banana-pro` | `gemini-3-pro-image-preview` | Original spec proposed `gemini-2.5-image-pro` — superseded. Google's "Nano Banana Pro" tier moved to Gemini 3 Pro. |
| `design-studio` | `recraft-v3` | Unchanged. |
| `speed-draft` | `stability.sd3-large-v1:0` | Unchanged. (provider's internal `bedrock-sd35` alias removed; dispatch is now by internal code.) |
| `nova-canvas` | `amazon.nova-canvas-v1:0` | New seeded `models` row. The Bedrock provider already handled this id; the migration just makes it admin-visible. |

Deferred / out of scope:
- `imagen-3` (`imagen-3.0-generate-002`) — Vertex AI auth path is distinct from the Gemini API key used by `google-image.ts`. Plan was "one class with model-routing inside, since they share auth" — that's only true for the Gemini-API family. Imagen 3 needs its own provider class with Vertex/service-account auth. Filed for post-launch.
- BFL `--ultra` raw-mode (`flux_1_1_pro_ultra_raw`) — out of scope per § 5.

Smoke status (B4):
- BFL: `BFL_API_KEY` present in local `.env.local`; smoke runnable via the standard worker dev path. Real-key fixture not committed (cost) — capture on first manual smoke.
- Google: `GOOGLE_GENAI_API_KEY` not yet provisioned locally; smoke skipped per plan. The provider has full unit-test coverage (`google-image.test.ts`).
- OpenAI / Replicate / Bedrock / Recraft: existing real-key paths unchanged by B; covered by their pre-existing provider tests.
