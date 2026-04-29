CREATE TABLE IF NOT EXISTS landing_hero_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  s3_key text NOT NULL,
  headline text NOT NULL,
  sub text NOT NULL DEFAULT '',
  text_position text NOT NULL DEFAULT 'bottom',
  text_color text NOT NULL DEFAULT 'white',
  brand_initials text NOT NULL DEFAULT 'NW',
  brand_color text NOT NULL DEFAULT '#FFFFFF',
  brand_text_color text NOT NULL DEFAULT '#2A1F18',
  badge_text text,
  badge_bg text,
  badge_color text,
  rotation integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_hero_status_idx
  ON landing_hero_cards (status, sort_order);

ALTER TABLE landing_hero_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_hero_cards FORCE ROW LEVEL SECURITY;
CREATE POLICY landing_hero_user_read ON landing_hero_cards
  FOR SELECT TO app_user USING (status = 'published');
CREATE POLICY landing_hero_admin_all ON landing_hero_cards
  FOR ALL TO app_admin USING (true);

GRANT SELECT ON landing_hero_cards TO app_user;
GRANT ALL ON landing_hero_cards TO app_admin;
