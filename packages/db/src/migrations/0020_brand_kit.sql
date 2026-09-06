-- Brand kit: describe what each logo IS, and give the brand a voice the copy
-- pipeline can read. Every column is additive with a default, so existing rows
-- stay valid.

ALTER TABLE brand_assets
  ADD COLUMN variant    text    NOT NULL DEFAULT 'lockup',
  ADD COLUMN background text    NOT NULL DEFAULT 'any',
  ADD COLUMN label      text,
  ADD COLUMN is_primary boolean NOT NULL DEFAULT false;
--> statement-breakpoint

ALTER TABLE brand_assets
  ADD CONSTRAINT brand_assets_variant_check
    CHECK (variant IN ('lockup', 'mark', 'wordmark', 'other')),
  ADD CONSTRAINT brand_assets_background_check
    CHECK (background IN ('light', 'dark', 'any'));
--> statement-breakpoint

-- The renderer composites exactly one logo, so exactly one may claim the slot.
CREATE UNIQUE INDEX brand_assets_one_primary_logo_idx
  ON brand_assets (brand_id) WHERE is_primary;
--> statement-breakpoint

-- Backfill: the logo the brand already names, else its newest logo.
UPDATE brand_assets a
SET is_primary = true
FROM (
  SELECT DISTINCT ON (assets.brand_id) assets.id
  FROM brand_assets assets
  JOIN brands b ON b.id = assets.brand_id
  WHERE assets.kind = 'logo'
  ORDER BY assets.brand_id,
           (assets.s3_key IS NOT DISTINCT FROM b.logo_s3_key) DESC,
           assets.created_at DESC
) chosen
WHERE a.id = chosen.id;
--> statement-breakpoint

-- ...and point the denormalised key at whatever won, so the two never disagree.
UPDATE brands b
SET logo_s3_key = a.s3_key
FROM brand_assets a
WHERE a.brand_id = b.id AND a.is_primary;
--> statement-breakpoint

ALTER TABLE brands
  ADD COLUMN descriptor text,
  ADD COLUMN voice      jsonb;
