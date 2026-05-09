-- Sub-project B (image providers): supported sizes lookup table + per-model
-- "allow custom size" override. The C UI uses these to populate its resolution
-- picker; the gateway exposes them via getSupportedSizes(modelCode).

CREATE TABLE "model_supported_sizes" (
  "model_code"  text    NOT NULL REFERENCES "models"("code") ON DELETE CASCADE,
  "width"       integer NOT NULL CHECK ("width"  > 0),
  "height"      integer NOT NULL CHECK ("height" > 0),
  "label"       text,
  "sort_order"  integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX "model_supported_sizes_pk"
  ON "model_supported_sizes" ("model_code", "width", "height");

ALTER TABLE "model_supported_sizes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "model_supported_sizes_admin_all"
  ON "model_supported_sizes" TO app_admin USING (true);
CREATE POLICY "model_supported_sizes_user_read"
  ON "model_supported_sizes" FOR SELECT TO app_user USING (true);

ALTER TABLE "models"
  ADD COLUMN "allow_custom_size" boolean NOT NULL DEFAULT false;

-- Custom sizing currently only on BFL Flux (economy + photoreal-pro both run
-- on flux-1.1-pro, which accepts arbitrary W×H within a min/max).
UPDATE "models" SET "allow_custom_size" = true
  WHERE "code" IN ('economy', 'photoreal-pro');

-- Seed sizes for the five models from migration 0016. Sort order chosen to
-- surface square first since it's the most common pick.
INSERT INTO "model_supported_sizes" ("model_code", "width", "height", "label", "sort_order") VALUES
  ('economy',       1024, 1024, 'Square',    0),
  ('economy',       1024, 1536, 'Portrait',  1),
  ('economy',       1536, 1024, 'Landscape', 2),
  ('photoreal-pro', 1024, 1024, 'Square',    0),
  ('photoreal-pro', 1024, 1536, 'Portrait',  1),
  ('photoreal-pro', 1536, 1024, 'Landscape', 2),
  ('text-master',   1024, 1024, 'Square',    0),
  ('text-master',   1024, 1536, 'Portrait',  1),
  ('text-master',   1536, 1024, 'Landscape', 2),
  ('design-studio', 1024, 1024, 'Square',    0),
  ('design-studio', 1024, 1707, 'Portrait',  1),
  ('design-studio', 1707, 1024, 'Landscape', 2),
  ('speed-draft',   1024, 1024, 'Square',    0),
  ('speed-draft',   1024, 1536, 'Portrait',  1),
  ('speed-draft',   1536, 1024, 'Landscape', 2);
