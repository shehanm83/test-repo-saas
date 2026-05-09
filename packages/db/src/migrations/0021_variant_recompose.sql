-- Sub-project D (manual crop tool): record when a variant was recomposed by
-- a user-driven crop, and what region they picked. background_s3_key stays
-- the source of truth so re-cropping is always possible (output_s3_key is
-- overwritten in place, see § 5 of the spec).

ALTER TABLE "generation_variants"
  ADD COLUMN "recomposed_at" timestamptz,
  ADD COLUMN "crop_region"   jsonb;
