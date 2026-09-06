# Slice 53 — Commercial Generation Contract, Preflight, and Pricing

**Phase:** 19 — Commercial generation upgrade
**Depends on:** 52, 29, 30
**Spec references:** [Generation Page Commercial Builder Spec](2026-05-03-generation-page-commercial-builder-spec.md)

**Definition of done:**
- `POST /api/generations` accepts both legacy simple inputs and the new commercial input contract.
- `POST /api/generations/estimate` returns credit estimates without reserving credits.
- `POST /api/generations/preflight` returns warnings and blocking errors before generation.
- Product snapshots are stored on generation settings so future product edits do not mutate historical generations.
- Worker prompt building receives structured product/campaign/composition data.

## Files

**Create:**
- `packages/shared/src/generation/commercial-contract.ts`
- `packages/shared/src/generation/preflight.ts`
- `packages/shared/src/generation/preflight.test.ts`
- `packages/api/src/generation-estimate.ts`
- `packages/api/src/generation-preflight.ts`
- `apps/web/app/api/generations/estimate/route.ts`
- `apps/web/app/api/generations/preflight/route.ts`

**Modify:**
- `packages/api/src/generation.ts`
- `packages/api/src/generation.test.ts`
- `apps/web/app/api/generations/route.ts`
- `apps/worker/src/handler.ts`
- `packages/shared/src/index.ts`
- `packages/db/src/queries/generation.ts`

## Contract Requirements

Support:

- Creation types: `single_product`, `product_bundle`, `campaign_set`, `leaflet_catalogue`, `comparison`, `social_ad_pack`.
- Product references from saved products or fresh uploads.
- Structured campaign fields: title, subtitle, message, price, discount, badge, CTA, expiry, legal text, website, phone, QR URL, benefits, target audience.
- Template/layout selection.
- Product composition controls.
- Output formats and package settings.
- Consistency mode.

## Backend Rules

- Preserve legacy `brief`, `outputTarget`, `inspirationUploadIds`, `flags`, `numVariants` for backward compatibility.
- Normalize Quick Create into the same commercial contract internally.
- Snapshot all product and campaign fields in `generations.settings.commercial`.
- Store claimed product upload keys similarly to current inspiration uploads.
- Do not trust frontend credit calculation; estimate and generation creation must share server-side pricing logic.
- Keep exact commercial text outside the model when the renderer can place it.

## Preflight Rules

Return:

```ts
type PreflightResult = {
  blocking: Array<{ code: string; message: string; field?: string }>;
  warnings: Array<{ code: string; message: string; field?: string; severity: "low" | "medium" | "high" }>;
  estimate: {
    credits: number;
    lineItems: Array<{ label: string; credits: number }>;
  };
};
```

Implement checks:

- Missing product for product modes.
- Missing output formats.
- Missing price for sale/catalogue templates.
- Missing CTA for social ad templates.
- Missing logo when logo is enabled.
- Product image dimensions below target threshold.
- Text length likely to overflow template safe zones.
- Invalid QR URL.
- Offer expiry in the past.
- Too many products for selected layout.
- Mood/template aspect ratio mismatch.
- Insufficient credits.

## Tasks

- [x] Define Zod schemas and TypeScript types in shared package.
- [x] Add contract parser that converts legacy input and Quick Create input into a normalized commercial request.
- [x] Add `GenerationEstimateApi` that calculates pricing line items without ledger reservation.
- [x] Add `GenerationPreflightApi` that validates request readiness and calls estimate.
- [x] Extend `GenerationApi.create` to store commercial snapshots and respect requested variant count/output formats.
- [x] Extend worker prompt/render payload mapping to use commercial fields.
- [x] Add tests for contract normalization, preflight warnings, estimate parity, and backward compatibility.

## Verification

```bash
pnpm --filter @layertone/shared test
pnpm --filter @layertone/api test -- generation
pnpm --filter @layertone/worker test
```

## Commit Message

```bash
feat(generation): add commercial generation contract and preflight
```
