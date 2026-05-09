-- Sub-project C cleanup: drop the legacy price_book_entries.premium_flag
-- column. After A's taxonomy work, premium-tier vs. standard-tier is decided
-- by tier_strength_routing keyed on models.code; nothing reads premium_flag
-- at runtime (verified — see commits in feature/image-model-taxonomy).
--
-- The active index includes premium_flag, so we drop and recreate it without
-- the column.

DROP INDEX IF EXISTS "price_book_active_idx";

ALTER TABLE "price_book_entries"
  DROP COLUMN IF EXISTS "premium_flag";

CREATE INDEX "price_book_active_idx"
  ON "price_book_entries" ("model_code", "size_bucket", "has_inspiration_flag", "version");
