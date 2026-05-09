# Slice 55 — Output Packages, Consistency, and Commercial Quality Checks

**Phase:** 19 — Commercial generation upgrade
**Depends on:** 53, 54, 40
**Spec references:** [Generation Page Commercial Builder Spec](2026-05-03-generation-page-commercial-builder-spec.md)

**Definition of done:**
- Campaign set and social ad pack modes can produce multiple output formats from one request.
- Results page groups related outputs as a package.
- Campaign consistency mode keeps shared visual direction across all generated assets.
- Commercial quality checks run before generation and are visible in the UI.
- Credit estimates include variants, output formats, premium model, extra products, and package operations.

## Files

**Create:**
- `packages/db/src/schema/generation-package.ts`
- `packages/db/src/queries/generation-package.ts`
- `packages/db/src/migrations/0009_generation_packages.sql`
- `packages/shared/src/generation/output-packages.ts`
- `packages/shared/src/generation/output-packages.test.ts`
- `packages/api/src/generation-package.ts`
- `packages/api/src/generation-package.test.ts`
- `apps/web/components/results/generation-package-view.tsx`

**Modify:**
- `packages/db/src/schema/index.ts`
- `packages/api/src/generation.ts`
- `apps/worker/src/handler.ts`
- `apps/web/components/results/generation-view.tsx`
- `apps/web/app/(app)/generations/[id]/page.tsx`
- `packages/db/src/queries/generation.ts`

## Data Model

Add `generation_packages`:

- `id`
- `workspace_id`
- `brand_id`
- `project_id`
- `name`
- `creation_type`
- `campaign_snapshot jsonb`
- `style_seed`
- `style_brief`
- `status`
- `estimated_credits`
- `created_by_user_id`
- `created_at`
- `completed_at`

Add nullable `package_id` and `output_format` to `generations`.

## Output Package Rules

Supported package format IDs:

- `instagram_square`
- `instagram_portrait`
- `instagram_story`
- `facebook_feed`
- `linkedin_feed`
- `website_banner`
- `product_card`
- `ad_creative`
- `print_leaflet_a4`

Each format resolves to:

- Width
- Height
- Aspect ratio
- Template compatibility rules
- Text safe zone constraints
- Pricing size bucket

## Consistency Rules

For `same_mood`:

- Reuse mood, template family, palette, and composition settings.
- Let individual output formats pick compatible templates.

For `strict_campaign`:

- Generate and store `style_seed`.
- Store a single `style_brief` on the package.
- Pass the same `style_brief` to every generation job.
- Prefer same template family and image model.
- Disallow incompatible mood/layout combinations in preflight.

## Results UX

Package results should show:

- Package status summary.
- Group by output format.
- Within each format, show generated variants.
- Download individual images.
- Download full package ZIP.
- Regenerate one output format.
- Regenerate full package with same style settings.

## Quality Checks

Run checks in `/api/generations/preflight` and store the final preflight result on package/generation settings:

- Product image size and aspect suitability.
- Missing product image cutout for marketplace white/transparent background.
- Missing price, discount, CTA, or legal fields when required by template family.
- Text overflow risk by safe zone.
- Missing logo/colors/fonts when enabled.
- QR URL validity.
- Expired offer.
- Catalogue product count vs layout capacity.
- Output format compatibility.
- Credit availability.

## Tasks

- [ ] Add package schema, migration, RLS, and queries.
- [ ] Extend generation creation to create a package for multi-format modes.
- [ ] Resolve output pack formats into one or more generation records.
- [ ] Extend worker payload with package style seed and style brief.
- [ ] Add quality check persistence for final submitted preflight.
- [ ] Update results page to detect and render package grouping.
- [ ] Add ZIP download endpoint if storage package assembly exists; otherwise create server-side zip assembly using signed object reads.
- [ ] Add tests for output package resolution, pricing line items, package creation, and package results mapping.
- [ ] Add E2E test for social ad pack generation under mock AI mode.

## Verification

```bash
pnpm --filter @vyora/shared test
pnpm --filter @vyora/api test -- generation-package
pnpm --filter @vyora/web test
pnpm --filter @vyora/worker test
```

## Commit Message

```bash
feat(generation): add output packages and campaign consistency
```

