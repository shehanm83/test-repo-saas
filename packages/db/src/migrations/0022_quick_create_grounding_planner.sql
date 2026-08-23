ALTER TABLE moods
  ADD COLUMN IF NOT EXISTS recipe_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recipe jsonb;

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS family text NOT NULL DEFAULT 'product_hero',
  ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'centered_product_hero',
  ADD COLUMN IF NOT EXISTS renderer_compatibility text NOT NULL DEFAULT 'satori';

ALTER TABLE generation_variants
  ADD COLUMN IF NOT EXISTS variant_spec jsonb,
  ADD COLUMN IF NOT EXISTS prompt_metadata jsonb,
  ADD COLUMN IF NOT EXISTS reference_snapshots jsonb,
  ADD COLUMN IF NOT EXISTS seed integer;

CREATE TABLE IF NOT EXISTS mood_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mood_id uuid NOT NULL REFERENCES moods(id) ON DELETE CASCADE,
  s3_key text NOT NULL,
  mime_type text NOT NULL,
  purpose text NOT NULL DEFAULT 'style',
  weight integer NOT NULL DEFAULT 70 CHECK (weight BETWEEN 0 AND 100),
  approved_for_model_use boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mood_assets_mood_idx ON mood_assets (mood_id, approved_for_model_use);

ALTER TABLE mood_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY mood_assets_user_read ON mood_assets FOR SELECT TO app_user
  USING (EXISTS (SELECT 1 FROM moods WHERE moods.id = mood_assets.mood_id AND moods.status = 'published'));
CREATE POLICY mood_assets_admin_all ON mood_assets FOR ALL TO app_admin USING (true);
GRANT SELECT ON mood_assets TO app_user;
GRANT ALL ON mood_assets TO app_admin;

-- The fallback template promises a centered product hero and no exact-copy slots.
UPDATE templates
SET family = 'product_hero',
    layout = 'centered_product_hero',
    slots = '["headline","subtitle","price","discount","badgeText","cta","offerExpiry","legalText","website","phone","qrUrl","logo","certification"]'::jsonb,
    renderer_compatibility = CASE WHEN requires_browser_render THEN 'browser' ELSE 'satori' END
WHERE slug = 'quick-create-image-only';

-- Always fill the target. Provider-specific framing instructions protect the subject;
-- this removes the old accidental letterboxing behavior.
UPDATE templates
SET jsx_source = $template$
function template({ background, output }) {
  return h("div", {
    style: {
      display: "flex",
      width: output.width,
      height: output.height,
      position: "relative",
      overflow: "hidden",
      backgroundColor: "#f7f7f7",
    },
  },
    h("img", {
      src: background.dataUrl,
      style: {
        position: "absolute",
        inset: 0,
        width: output.width,
        height: output.height,
        objectFit: "cover",
        objectPosition: "center",
      },
    })
  );
}
$template$,
updated_at = now()
WHERE slug = 'quick-create-image-only';
