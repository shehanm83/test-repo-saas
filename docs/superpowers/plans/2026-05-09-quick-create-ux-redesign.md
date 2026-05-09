# Quick Create UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Each task is sized for one focused subagent run; do not split further.

**Goal:** Replace the platform/format/aspectRatio dropdowns with a use-case-first 3-step picker driven by A's tier/strength taxonomy and B's `model_supported_sizes`.

**Spec:** `docs/superpowers/specs/2026-05-09-quick-create-ux-redesign-design.md`
**Architecture:** New `use_cases` reference table + admin CRUD. New `<QuickCreateWizard>` client component on `/generate` replaces the current settings panel. Estimate endpoint exposes `resolveSelection` over GET. Server-side request shape already accepts the new fields from A; this plan adds the use_case dimension on top.

**Tasks: 4 total.**

---

## Task C1: Use-case taxonomy — schema, admin API, admin UI

**Files (create):**
- `packages/db/src/schema/use-cases.ts` (new schema file)
- `packages/db/src/migrations/0019_use_cases.sql`
- `packages/db/src/queries/use-cases.ts` (`listUseCases`, `getUseCase`, admin CRUD)
- `packages/api/src/use-cases.ts` (`UseCaseApi` class with Zod validators)
- `apps/web/app/api/admin/use-cases/route.ts`, `[code]/route.ts`
- `apps/web/app/api/use-cases/route.ts` (public list endpoint for the wizard)
- `apps/web/app/admin/use-cases/page.tsx`
- `apps/web/components/admin/use-cases-admin.tsx`
- `apps/web/tests/admin/use-cases-admin.test.tsx`

**Files (modify):**
- `packages/db/src/schema/index.ts` (re-export)
- `packages/db/src/migrations/meta/_journal.json` (idx 18)
- `packages/db/src/index.ts` (re-export queries)
- `packages/api/package.json` (add `./use-cases` export)

The `use_cases` table per the spec § 2. Admin UI mirrors A's `/admin/strengths` page exactly — same table layout, same modal-create pattern, same delete confirm. Reuse the components and forms.

Migration seeds 8 starter use_cases:

```sql
INSERT INTO use_cases (code, label, platform, target_width, target_height, aspect_ratio, icon, sort_order) VALUES
  ('fb-landscape',  'Facebook Landscape',  'facebook',  1280,  668, '1.91:1', '🟦', 0),
  ('fb-square',     'Facebook Square',     'facebook',  1080, 1080, '1:1',    '🟦', 1),
  ('ig-post-1x1',   'Instagram Post',      'instagram', 1080, 1080, '1:1',    '🟪', 2),
  ('ig-portrait',   'Instagram Portrait',  'instagram', 1080, 1350, '4:5',    '🟪', 3),
  ('ig-story',      'Instagram Story',     'instagram', 1080, 1920, '9:16',   '🟪', 4),
  ('li-banner',     'LinkedIn Banner',     'linkedin',  1584,  396, '4:1',    '🟦', 5),
  ('pin-vertical',  'Pinterest Pin',       'pinterest', 1000, 1500, '2:3',    '🟥', 6),
  ('email-hero',    'Email Hero',          'email',      600,  300, '2:1',    '✉️', 7);
```

Admin CRUD endpoints under `/api/admin/use-cases/` mirror A's strengths admin (T10) — Zod-validated POST/PUT, audit log entries `admin.use-cases.{create,update,delete}`. Public GET at `/api/use-cases` (unauth, returns active rows only) is what the wizard fetches.

Run migration, run typecheck, smoke the public endpoint with curl, commit:
```
git commit -m "feat(use-cases): admin-managed use_cases catalogue + CRUD + admin UI"
```

Verify: `pnpm --filter @vyora/db --filter @vyora/api --filter @vyora/web typecheck` clean; `curl -s http://localhost:3000/api/use-cases | jq length` returns 8; admin UI at `/admin/use-cases` lists all rows with create/edit/delete working.

---

## Task C2: Generation estimate endpoint + request contract extension

**Files (create):**
- `apps/web/app/api/generations/estimate/route.ts`

**Files (modify):**
- `packages/shared/src/generation/commercial-contract.ts` (extend `OutputTarget` schema with optional `useCaseCode`)
- `packages/api/src/generation.ts` (translate `useCaseCode` into target_w/h on submit; back-compat with existing `platform/format` payload)
- `packages/db/src/queries/use-cases.ts` (already created in C1)

The estimate endpoint accepts query params and returns the price breakdown:

```typescript
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tier = url.searchParams.get("tier") ?? "standard";
  const strength = url.searchParams.get("strength") ?? undefined;
  const sizeBucket = (url.searchParams.get("sizeBucket") ?? "standard") as "standard" | "large";
  const hasInspiration = url.searchParams.get("hasInspiration") === "true";
  const selectedModelCodes = url.searchParams.getAll("modelCode");
  // … resolveSelection wrapper, return { totalCredits, models: [{ displayName, credits }] }
}
```

Reuse `resolveSelection` from A. The endpoint is unauth (no PII), but rate-limited per IP via the existing rate-limit middleware.

`OutputTarget` schema gains an optional `useCaseCode: z.string().optional()`. When present, the API looks up the use_case row, sets `target_width`/`target_height`/`aspectRatio` from it (server-side authoritative), and stores the use_case code on the generation row's `settings.output_target.useCaseCode` for audit. When absent, the legacy `platform/format` translation path runs unchanged.

Add `use_case_code` to the `generations.settings` shape (no schema migration; settings is jsonb).

Run `@vyora/api` test suite (mocked db); commit:
```
git commit -m "feat(api): /api/generations/estimate + useCaseCode-aware request contract"
```

Verify: estimate endpoint returns sensible JSON for `?tier=premium&strength=photoreal&sizeBucket=standard`; submitting a generation with `useCaseCode: "ig-story"` lands a variant with the right dimensions.

---

## Task C3: Quick Create wizard rebuild

**Files (create):**
- `apps/web/components/generate/quick-create-wizard.tsx` (new client component, ~400-500 lines)
- `apps/web/components/generate/use-case-tile.tsx` (small presentational component)
- `apps/web/tests/generate/quick-create-wizard.test.tsx`

**Files (modify):**
- `apps/web/app/(app)/generate/page.tsx` (server component — fetches use-cases, tier options, and the user's brands; passes to wizard; replaces the existing settings panel)
- `apps/web/components/generate/*` (existing settings panel components — delete or relegate; check what's still used by other pages before deleting)

The wizard is the meat of this sub-project. It owns the 3-step accordion state and orchestrates the API calls.

State shape (use a single `useReducer`):
```typescript
type Step = 1 | 2 | 3;
interface WizardState {
  step: Step;
  useCaseCode: string | null;
  tier: "standard" | "premium" | null;
  strength: string | null;
  selectedModelCodes: string[];          // empty = default; multi = compare
  resolution: { w: number; h: number } | null;
  customSize: { w: number; h: number } | null;
  estimate: { totalCredits: number; models: Array<{ displayName: string; credits: number }> } | null;
}
```

Behaviour:
- Step 1: grid of use-case tiles (from `/api/use-cases`). On click, set `useCaseCode`, advance to step 2.
- Step 2: standard/premium radio. If premium, render chip group of strengths from the prefetched `tierOptions` (server-fetched via `getTierOptions`). When the bucket has 2+ models, show an inline "Compare with" multi-select dropdown — selecting models adds to `selectedModelCodes`. On valid selection, advance to step 3.
- Step 3: fetch `/api/generations/estimate` after assembling the selection. The estimate response carries the resolved model code(s); fetch each model's `model_supported_sizes` (via a second public endpoint `/api/models/[code]/sizes` — add it). Filter to sizes whose aspect ratio matches the use-case's `aspectRatio` (5% tolerance helper). Render chip group; default-select the first match. If `model.allow_custom_size`, add a "Custom" tile that opens a small W×H input.
- Submit button is enabled only when steps 1-3 are all set; clicking POSTs `/api/generations` with the new shape and navigates to the result page.

The "no compatible size" branch shows the messaging from spec § 3 with two CTAs: "Try a different strength" (jumps back to step 2) and "Generate at native size and crop later" (selects the model's largest size and submits with a flag for D's recompose UI to show prominently).

A new public endpoint is required for the size lookup:
- `apps/web/app/api/models/[code]/sizes/route.ts` — GET, unauth, returns `{ sizes: [{ width, height, label }], allowCustomSize: boolean }`.

Render test: render with mocked use-cases + tier options + sizes; click through all three steps and assert the submit button enables.

This is the largest single file in the plan (~400-500 lines including JSX). Acceptable per the user's "big tasks" preference.

Commit:
```
git commit -m "feat(generate): 3-step Quick Create wizard with use-case → tier → resolution flow"
```

Verify: `pnpm --filter @vyora/web typecheck` clean; the render test passes; manually clicking through `/generate` in the browser produces the new wizard.

---

## Task C4: End-to-end smoke + cleanup of legacy settings panel

**Files (modify):**
- `apps/web/components/generate/*` (delete the old settings panel components that the new wizard replaces; grep for callers and update — check `OldSettingsPanel`, `PlatformPicker`, `FormatDropdown`, etc.)
- `apps/web/app/(app)/generate/page.tsx` (drop the imports of the removed components)

Smoke (manual + tsx):
1. Navigate to `/generate`, pick FB Landscape → Premium → Photoreal → first compatible native size. Submit. Watch the worker dequeue.
2. Confirm the variant lands with `model_used = "photoreal-pro"`, `output_s3_key` non-null, and dimensions matching the picked size (NOT the use_case target — those will differ).
3. Try a use-case (LinkedIn Banner = 4:1) where no model has a 4:1 native size. Confirm the wizard shows the "no native match" UI and offers the fallback option.
4. Try multi-model variation: pick FB Landscape, Premium, Text, with two `selectedModelCodes`. Confirm two variants are queued, each with a different model.

After smoke passes, sweep for dead code from the old settings panel — delete files no longer imported anywhere. Run `pnpm -r build` to surface any orphan references.

Migration to drop legacy `price_book_entries.premium_flag` column lands at the end of this task — A's plan explicitly deferred it to "after sub-project C ships":
- `packages/db/src/migrations/0020_drop_premium_flag.sql`: `ALTER TABLE price_book_entries DROP COLUMN premium_flag;`
- Update Drizzle schema in `packages/db/src/schema/catalog.ts` to drop the column.
- Run `pnpm db:migrate`. Verify the column is gone.

Commit (single combined commit for cleanup + drop migration):
```
git commit -m "feat(generate): retire legacy settings panel; drop price_book_entries.premium_flag"
```

Verify: `git log master..HEAD` shows 4 commits for sub-project C; smoke checks 1-4 pass; the gap doc's "auto-crop pain" entry can be marked resolved if it was tracked there.

---

## What's NOT in this plan

- Manual crop tool (sub-project D — invoked from this wizard's "no native match" fallback)
- Saving wizard selections as named presets per workspace
- Mobile-specific layouts (responsive grid scales but isn't tuned)
- A/B testing the wizard against the legacy panel — pure replacement
