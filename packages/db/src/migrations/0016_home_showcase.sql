CREATE TABLE IF NOT EXISTS home_showcase_config (
  id text PRIMARY KEY DEFAULT 'singleton',
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS home_showcase_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  s3_key text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE home_showcase_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_showcase_config FORCE ROW LEVEL SECURITY;
CREATE POLICY home_showcase_config_user_read ON home_showcase_config
  FOR SELECT TO app_user USING (true);
CREATE POLICY home_showcase_config_admin_all ON home_showcase_config
  FOR ALL TO app_admin USING (true);

ALTER TABLE home_showcase_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_showcase_images FORCE ROW LEVEL SECURITY;
CREATE POLICY home_showcase_images_user_read ON home_showcase_images
  FOR SELECT TO app_user USING (true);
CREATE POLICY home_showcase_images_admin_all ON home_showcase_images
  FOR ALL TO app_admin USING (true);

GRANT SELECT ON home_showcase_config TO app_user;
GRANT ALL ON home_showcase_config TO app_admin;
GRANT SELECT ON home_showcase_images TO app_user;
GRANT ALL ON home_showcase_images TO app_admin;
