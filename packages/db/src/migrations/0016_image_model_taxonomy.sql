-- New tables (FK ordering: lookups first, joins after)
CREATE TABLE "quality_tiers" (
  "code" text PRIMARY KEY,
  "label" text NOT NULL,
  "description" text,
  "requires_strength" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE TABLE "strengths" (
  "code" text PRIMARY KEY,
  "label" text NOT NULL,
  "description" text,
  "icon" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "models" (
  "code" text PRIMARY KEY,
  "display_name" text NOT NULL,
  "description" text,
  "vendor" text NOT NULL,
  "llm_model_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','paused','deprecated')),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "model_strengths" (
  "model_code" text NOT NULL REFERENCES "models"("code") ON DELETE CASCADE,
  "strength_code" text NOT NULL REFERENCES "strengths"("code") ON DELETE RESTRICT,
  PRIMARY KEY ("model_code", "strength_code")
);

CREATE TABLE "tags" (
  "code" text PRIMARY KEY,
  "label" text NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "model_tags" (
  "model_code" text NOT NULL REFERENCES "models"("code") ON DELETE CASCADE,
  "tag_code" text NOT NULL REFERENCES "tags"("code") ON DELETE CASCADE,
  PRIMARY KEY ("model_code", "tag_code")
);

CREATE TABLE "tier_strength_routing" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tier_code" text NOT NULL REFERENCES "quality_tiers"("code") ON DELETE RESTRICT,
  "strength_code" text REFERENCES "strengths"("code") ON DELETE RESTRICT,
  "model_code" text NOT NULL REFERENCES "models"("code") ON DELETE RESTRICT,
  "is_default" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "version" integer NOT NULL DEFAULT 1,
  "effective_from" timestamptz NOT NULL DEFAULT now(),
  "effective_to" timestamptz
);

CREATE UNIQUE INDEX "tier_strength_routing_version_unique"
  ON "tier_strength_routing" ("tier_code", "strength_code", "model_code", "version");

-- Partial unique: exactly one default per active (tier, strength) bucket.
-- COALESCE handles the NULL strength_code case (standard tier).
CREATE UNIQUE INDEX "tier_strength_routing_active_default_unique"
  ON "tier_strength_routing" ("tier_code", COALESCE("strength_code", '__null__'))
  WHERE "is_default" = true AND "effective_to" IS NULL;

-- RLS: admin only (these are global config, not workspace-scoped)
ALTER TABLE "quality_tiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "strengths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "model_strengths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "model_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tier_strength_routing" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxonomy_admin_all" ON "quality_tiers" TO app_admin USING (true);
CREATE POLICY "taxonomy_user_read" ON "quality_tiers" FOR SELECT TO app_user USING (true);
CREATE POLICY "strengths_admin_all" ON "strengths" TO app_admin USING (true);
CREATE POLICY "strengths_user_read" ON "strengths" FOR SELECT TO app_user USING (true);
CREATE POLICY "models_admin_all" ON "models" TO app_admin USING (true);
CREATE POLICY "models_user_read" ON "models" FOR SELECT TO app_user USING (true);
CREATE POLICY "model_strengths_admin_all" ON "model_strengths" TO app_admin USING (true);
CREATE POLICY "model_strengths_user_read" ON "model_strengths" FOR SELECT TO app_user USING (true);
CREATE POLICY "tags_admin_all" ON "tags" TO app_admin USING (true);
CREATE POLICY "tags_user_read" ON "tags" FOR SELECT TO app_user USING (true);
CREATE POLICY "model_tags_admin_all" ON "model_tags" TO app_admin USING (true);
CREATE POLICY "model_tags_user_read" ON "model_tags" FOR SELECT TO app_user USING (true);
CREATE POLICY "routing_admin_all" ON "tier_strength_routing" TO app_admin USING (true);
CREATE POLICY "routing_user_read" ON "tier_strength_routing" FOR SELECT TO app_user USING (true);

-- Seed lookup data
INSERT INTO "quality_tiers" ("code", "label", "description", "requires_strength", "sort_order") VALUES
  ('standard', 'Standard', 'Single default model — fast & affordable',  false, 0),
  ('premium',  'Premium',  'Pick a model strength for the result',      true,  1);

INSERT INTO "strengths" ("code", "label", "description", "sort_order") VALUES
  ('text',      'Text rendering',       'Best at exact text/typography in image', 0),
  ('photoreal', 'Photoreal',            'Photographic realism',                    1),
  ('design',    'Design / Typographic', 'Editorial, poster, vector-feel',          2),
  ('speed',     'Speed / Iteration',    'Fast cheap drafts',                       3);

INSERT INTO "models" ("code", "display_name", "description", "vendor", "llm_model_id", "status") VALUES
  ('economy',       'Economy',       'Default standard-tier model — fast and affordable.', 'replicate', 'flux-1.1-pro',  'active'),
  ('photoreal-pro', 'Photoreal Pro', 'Premium photographic realism.',                       'replicate', 'flux-1.1-pro',  'active'),
  ('text-master',   'Text Master',   'Premium model tuned for exact text in images.',       'openai',    'gpt-image-1',   'active'),
  ('design-studio', 'Design Studio', 'Premium design / typographic model.',                 'recraft',   'recraft-v3',    'active'),
  ('speed-draft',   'Speed Draft',   'Premium fast-iteration model.',                       'bedrock',   'bedrock-sd35',  'active');

INSERT INTO "model_strengths" ("model_code", "strength_code") VALUES
  ('text-master',   'text'),
  ('photoreal-pro', 'photoreal'),
  ('design-studio', 'design'),
  ('speed-draft',   'speed');

INSERT INTO "tier_strength_routing" ("tier_code", "strength_code", "model_code", "is_default", "sort_order") VALUES
  ('standard', NULL,        'economy',       true, 0),
  ('premium',  'text',      'text-master',   true, 0),
  ('premium',  'photoreal', 'photoreal-pro', true, 0),
  ('premium',  'design',    'design-studio', true, 0),
  ('premium',  'speed',     'speed-draft',   true, 0);

-- Backfill price_book_entries.model_code BEFORE adding the FK.
-- Existing rows use llm_model_id strings; remap to new models.code values.
UPDATE "price_book_entries" SET "model_code" = 'photoreal-pro'
  WHERE "model_code" = 'flux-1.1-pro' AND "premium_flag" = true;
UPDATE "price_book_entries" SET "model_code" = 'economy'
  WHERE "model_code" = 'flux-1.1-pro' AND "premium_flag" = false;
UPDATE "price_book_entries" SET "model_code" = 'text-master'
  WHERE "model_code" IN ('gpt-image-1','gpt-image-2');
UPDATE "price_book_entries" SET "model_code" = 'design-studio'
  WHERE "model_code" = 'recraft-v3';
UPDATE "price_book_entries" SET "model_code" = 'speed-draft'
  WHERE "model_code" IN ('bedrock-sd35','nova-canvas');

-- Now the FK is safe.
ALTER TABLE "price_book_entries"
  ADD CONSTRAINT "price_book_entries_model_code_fkey"
  FOREIGN KEY ("model_code") REFERENCES "models"("code") ON DELETE RESTRICT;
