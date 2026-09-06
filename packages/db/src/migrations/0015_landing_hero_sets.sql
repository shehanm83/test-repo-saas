CREATE TABLE IF NOT EXISTS landing_hero_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  weight integer NOT NULL DEFAULT 1,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_hero_sets_status_idx
  ON landing_hero_sets (status, weight, updated_at);

CREATE TABLE IF NOT EXISTS landing_hero_set_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES landing_hero_sets(id) ON DELETE CASCADE,
  slot integer NOT NULL,
  s3_key text,
  image_url text,
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_hero_set_cards_slot_check CHECK (slot >= 1 AND slot <= 4),
  CONSTRAINT landing_hero_set_cards_image_check CHECK (s3_key IS NOT NULL OR image_url IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS landing_hero_set_cards_set_slot_uidx
  ON landing_hero_set_cards (set_id, slot);

ALTER TABLE landing_hero_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_hero_sets FORCE ROW LEVEL SECURITY;
CREATE POLICY landing_hero_sets_user_read ON landing_hero_sets
  FOR SELECT TO app_user USING (status = 'published');
CREATE POLICY landing_hero_sets_admin_all ON landing_hero_sets
  FOR ALL TO app_admin USING (true);

ALTER TABLE landing_hero_set_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_hero_set_cards FORCE ROW LEVEL SECURITY;
CREATE POLICY landing_hero_set_cards_user_read ON landing_hero_set_cards
  FOR SELECT TO app_user USING (
    EXISTS (
      SELECT 1
      FROM landing_hero_sets
      WHERE landing_hero_sets.id = landing_hero_set_cards.set_id
        AND landing_hero_sets.status = 'published'
    )
  );
CREATE POLICY landing_hero_set_cards_admin_all ON landing_hero_set_cards
  FOR ALL TO app_admin USING (true);

GRANT SELECT ON landing_hero_sets TO app_user;
GRANT ALL ON landing_hero_sets TO app_admin;
GRANT SELECT ON landing_hero_set_cards TO app_user;
GRANT ALL ON landing_hero_set_cards TO app_admin;
