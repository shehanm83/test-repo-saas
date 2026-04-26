CREATE TABLE IF NOT EXISTS moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL,
  valid_from timestamptz,
  valid_to timestamptz,
  prompt_modifiers text NOT NULL DEFAULT '',
  negative_prompts text NOT NULL DEFAULT '',
  accent_palette jsonb NOT NULL DEFAULT '[]'::jsonb,
  decoration_tags text[],
  typography_hint jsonb,
  supported_aspect_ratios text[] NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  preview_s3_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  jsx_source text NOT NULL,
  slots jsonb NOT NULL,
  text_safe_zones jsonb NOT NULL,
  preferred_model text NOT NULL,
  supported_aspect_ratios text[] NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  preview_s3_key text,
  requires_browser_render boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mood_template_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mood_id uuid NOT NULL REFERENCES moods(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  weight integer NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS stock_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  s3_key text NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  embedding vector(1536),
  license text,
  attribution text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_book_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code text NOT NULL,
  size_bucket text NOT NULL,
  premium_flag boolean NOT NULL DEFAULT false,
  has_inspiration_flag boolean NOT NULL DEFAULT false,
  credits integer NOT NULL,
  version integer NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mood_bindings_mood_idx ON mood_template_bindings (mood_id);
CREATE INDEX IF NOT EXISTS mood_bindings_template_idx ON mood_template_bindings (template_id);
CREATE INDEX IF NOT EXISTS stock_embedding_idx
  ON stock_assets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS moods_status_idx ON moods (status, kind, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS templates_status_idx ON templates (status, preferred_model);
CREATE INDEX IF NOT EXISTS price_book_active_idx
  ON price_book_entries (model_code, size_bucket, premium_flag, has_inspiration_flag, version);

ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE moods FORCE ROW LEVEL SECURITY;
CREATE POLICY moods_user_read ON moods FOR SELECT TO app_user USING (status = 'published');
CREATE POLICY moods_admin_all ON moods FOR ALL TO app_admin USING (true);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates FORCE ROW LEVEL SECURITY;
CREATE POLICY templates_user_read ON templates FOR SELECT TO app_user USING (status = 'published');
CREATE POLICY templates_admin_all ON templates FOR ALL TO app_admin USING (true);

ALTER TABLE mood_template_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_template_bindings FORCE ROW LEVEL SECURITY;
CREATE POLICY bindings_user_read ON mood_template_bindings FOR SELECT TO app_user USING (true);
CREATE POLICY bindings_admin_all ON mood_template_bindings FOR ALL TO app_admin USING (true);

ALTER TABLE stock_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY stock_user_read ON stock_assets FOR SELECT TO app_user USING (true);
CREATE POLICY stock_admin_all ON stock_assets FOR ALL TO app_admin USING (true);

ALTER TABLE price_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_book_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY pricebook_user_read ON price_book_entries FOR SELECT TO app_user USING (true);
CREATE POLICY pricebook_admin_all ON price_book_entries FOR ALL TO app_admin USING (true);

GRANT SELECT ON moods, templates, mood_template_bindings, stock_assets, price_book_entries TO app_user;
GRANT ALL ON moods, templates, mood_template_bindings, stock_assets, price_book_entries TO app_admin;
