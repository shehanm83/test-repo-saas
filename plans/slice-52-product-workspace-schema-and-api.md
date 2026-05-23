# Slice 52 — Product Workspace Schema and API

**Phase:** 19 — Commercial generation upgrade
**Depends on:** 07, 13, 14
**Spec references:** [Generation Page Commercial Builder Spec](2026-05-03-generation-page-commercial-builder-spec.md)

**Definition of done:**
- Workspaces can create product lines, products, product variants, and product assets.
- Product assets support product, packaging, lifestyle, label/detail, before, after, and cutout image kinds.
- Product rows are tenant-isolated with RLS.
- Product API supports list/create/update/archive and asset upload.
- `/generate` can fetch saved products for selection.

## Files

**Create:**
- `packages/db/src/schema/product.ts`
- `packages/db/src/queries/product.ts`
- `packages/db/src/migrations/0008_product_workspace.sql`
- `packages/api/src/product.ts`
- `packages/api/src/product.test.ts`
- `apps/web/app/api/product-lines/route.ts`
- `apps/web/app/api/product-lines/[id]/route.ts`
- `apps/web/app/api/products/route.ts`
- `apps/web/app/api/products/[id]/route.ts`
- `apps/web/app/api/products/[id]/assets/route.ts`
- `apps/web/app/api/products/[id]/variants/route.ts`
- `apps/web/app/api/product-variants/[id]/route.ts`

**Modify:**
- `packages/db/src/schema/index.ts`
- `packages/db/src/index.ts`
- `packages/api/src/index.ts`
- `packages/storage/src/keys.ts`

## Data Model

Create:

- `product_lines`: workspace-owned collection of related products.
- `products`: commercial metadata and searchable product records.
- `product_variants`: sellable product options such as color, size, material, flavor, or package quantity.
- `product_assets`: normalized image assets tied to products.

Recommended columns:

- `product_lines`: `id`, `workspace_id`, `brand_id`, `name`, `category`, `description`, `target_audience`, `default_currency`, `status`, `created_at`, `updated_at`.
- `products`: `id`, `workspace_id`, `product_line_id`, `brand_id`, `name`, `brand_label`, `model`, `sku`, `category`, `title`, `subtitle`, `description`, `price_minor`, `compare_at_price_minor`, `currency`, `discount_text`, `key_features jsonb`, `benefits jsonb`, `target_audience`, `variant_attributes jsonb`, `status`, `created_at`, `updated_at`.
- `product_variants`: `id`, `workspace_id`, `product_id`, `name`, `sku`, `color`, `size`, `material`, `flavor`, `package_quantity`, `price_minor`, `compare_at_price_minor`, `currency`, `asset_overrides jsonb`, `status`, `created_at`, `updated_at`.
- `product_assets`: `id`, `workspace_id`, `product_id`, `kind`, `s3_key`, `mime_type`, `width`, `height`, `bytes`, `has_transparency`, `background_removed`, `quality_score`, `label_visibility`, `created_at`.

## Tasks

- [ ] Add Drizzle schema and migration with indexes on `workspace_id`, `brand_id`, `product_line_id`, `product_id`, `status`, and product text search fields.
- [ ] Add RLS policies using `app.current_workspace_id` for all product tables.
- [ ] Add storage keys under `workspaces/{workspaceId}/products/{productId}/assets/{assetId}.{ext}`.
- [ ] Implement product queries with `withWorkspace`.
- [ ] Implement `ProductApi` with Zod validation, archive instead of destructive delete, and workspace ownership checks.
- [ ] Implement product asset upload using the same normalization rules as inspiration uploads: supported MIME types, max bytes, EXIF strip, image dimensions, storage metadata.
- [ ] Add API route handlers for list/create/update/archive and product asset upload.
- [ ] Add unit tests for validation and integration tests for tenant isolation.
- [ ] Seed 2-3 sample product lines for local development.

## Verification

```bash
pnpm --filter @layertone/db test
pnpm --filter @layertone/api test -- product
pnpm --filter @layertone/web typecheck
```

## Commit Message

```bash
feat(products): add reusable product workspace
```
