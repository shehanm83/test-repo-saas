-- Sub-project C (quick create UX redesign): admin-managed catalogue of
-- marketing surfaces. The Quick Create wizard's step 1 reads from this; the
-- target dimensions are then crossed against the chosen model's
-- model_supported_sizes (B's table) to produce step 3's resolution chips.

CREATE TABLE "use_cases" (
  "code"          text     PRIMARY KEY,
  "label"         text     NOT NULL,
  "platform"      text,
  "target_width"  integer  NOT NULL CHECK ("target_width"  > 0),
  "target_height" integer  NOT NULL CHECK ("target_height" > 0),
  "aspect_ratio"  text     NOT NULL,
  "icon"          text,
  "sort_order"    integer  NOT NULL DEFAULT 0,
  "status"        text     NOT NULL DEFAULT 'active'
                  CHECK ("status" IN ('active','paused','deprecated')),
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "updated_at"    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "use_cases" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "use_cases_admin_all" ON "use_cases" TO app_admin USING (true);
CREATE POLICY "use_cases_user_read" ON "use_cases" FOR SELECT TO app_user USING (true);

INSERT INTO "use_cases" ("code", "label", "platform", "target_width", "target_height", "aspect_ratio", "icon", "sort_order") VALUES
  ('fb-landscape', 'Facebook Landscape', 'facebook',  1280,  668, '1.91:1', '🟦', 0),
  ('fb-square',    'Facebook Square',    'facebook',  1080, 1080, '1:1',    '🟦', 1),
  ('ig-post-1x1',  'Instagram Post',     'instagram', 1080, 1080, '1:1',    '🟪', 2),
  ('ig-portrait',  'Instagram Portrait', 'instagram', 1080, 1350, '4:5',    '🟪', 3),
  ('ig-story',     'Instagram Story',    'instagram', 1080, 1920, '9:16',   '🟪', 4),
  ('li-banner',    'LinkedIn Banner',    'linkedin',  1584,  396, '4:1',    '🟦', 5),
  ('pin-vertical', 'Pinterest Pin',      'pinterest', 1000, 1500, '2:3',    '🟥', 6),
  ('email-hero',   'Email Hero',         'email',      600,  300, '2:1',    '✉️', 7);
