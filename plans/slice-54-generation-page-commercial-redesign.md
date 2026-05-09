# Slice 54 — Generation Page Commercial Redesign

**Phase:** 19 — Commercial generation upgrade
**Depends on:** 52, 53, 35, 36, 39
**Spec references:** [Generation Page Commercial Builder Spec](2026-05-03-generation-page-commercial-builder-spec.md)

**Definition of done:**
- `/generate` has two modes: `Quick Create` and `Campaign Builder`.
- Quick Create remains fast and requires only product/brief/brand/output.
- Campaign Builder implements the 8-step commercial workflow.
- Users can select saved products, create inline product drafts, and upload product images.
- Right rail shows live preflight warnings, format summary, and server-side credit estimate.
- Submit creates a generation/package and redirects to results.

## Files

**Create:**
- `apps/web/components/generate/commercial/types.ts`
- `apps/web/components/generate/commercial/generate-shell.tsx`
- `apps/web/components/generate/commercial/quick-create.tsx`
- `apps/web/components/generate/commercial/campaign-builder.tsx`
- `apps/web/components/generate/commercial/creation-type-step.tsx`
- `apps/web/components/generate/commercial/product-step.tsx`
- `apps/web/components/generate/commercial/campaign-details-step.tsx`
- `apps/web/components/generate/commercial/template-layout-step.tsx`
- `apps/web/components/generate/commercial/brand-mood-step.tsx`
- `apps/web/components/generate/commercial/composition-step.tsx`
- `apps/web/components/generate/commercial/output-settings-step.tsx`
- `apps/web/components/generate/commercial/review-rail.tsx`
- `apps/web/components/generate/commercial/preflight-panel.tsx`
- `apps/web/components/generate/commercial/product-picker.tsx`
- `apps/web/components/generate/commercial/inline-product-editor.tsx`
- Component tests for mode switching, required fields, and preflight rendering.

**Modify:**
- `apps/web/components/generate/generate.tsx`
- `apps/web/app/(app)/generate/page.tsx`
- `e2e/tests/signup-and-generate.spec.ts`

## UX Structure

### Quick Create

Fields:

- Product source: upload image or choose saved product.
- Brief.
- Brand and mood.
- Output target.
- Variant count and quality.
- Generate button.

Defaults:

- Creation type: `single_product`.
- Template family: `product_hero`.
- Layout: `centered_product_hero`.
- Composition: balanced product size, template position, soft shadow, preserve labels, keep original shape.
- Output: one selected format, two variants, standard quality.

### Campaign Builder

Steps:

1. Choose creation type.
2. Add products.
3. Campaign details.
4. Template and layout.
5. Brand and mood.
6. Product prominence and composition.
7. Output settings.
8. Review cost and generate.

### Right Rail

Always visible on desktop:

- Completion status.
- Selected products.
- Selected campaign/template/layout.
- Output formats.
- Preflight warnings.
- Credit estimate with line items.
- Generate package CTA.

## Visual Direction

Use the existing app shell and tokens, but the page should feel like a professional campaign workstation:

- Compact cards, not a long marketing landing page.
- Strong distinction between quick and advanced modes.
- Product thumbnails and format chips should be visually dominant.
- Warnings should be practical and readable, not modal-heavy.
- Avoid hiding commercial metadata behind one "advanced" textarea.

## State Management

- Keep state local to the page initially unless product editor is reused elsewhere.
- Use a reducer or typed state machine for Campaign Builder to avoid scattered `useState`.
- Debounce calls to `/api/generations/preflight`.
- Always submit the latest normalized commercial request returned by local state.

## Tasks

- [x] Replace the current linear form with `GenerateShell` and mode switch.
- [x] Implement Quick Create and ensure existing E2E generation path still works.
- [x] Implement Campaign Builder steps with completion gating.
- [x] Implement product picker and inline product draft creation.
- [x] Add server-driven preflight and estimate in the review rail.
- [x] Wire submit to existing `/api/generations` using the commercial contract.
- [x] Add responsive behavior for mobile.
- [x] Add component tests for mode switching, required-field gating, preflight display, and payload construction.
- [x] Update Playwright signup/generate test to use Quick Create.
- [x] Add a second Playwright test for Campaign Builder with mock product data.

## Verification

```bash
pnpm --filter @vyora/web test
pnpm --filter @vyora/web typecheck
pnpm --filter @vyora/e2e test -- signup-and-generate
```

## Commit Message

```bash
feat(web): redesign generation page for commercial campaigns
```
