CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_s3_key text,
  palette jsonb,
  fonts jsonb,
  voice_notes text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  kind text NOT NULL,
  s3_key text NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  bytes integer,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brands_workspace_idx ON brands (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brand_assets_brand_idx ON brand_assets (brand_id);
CREATE INDEX IF NOT EXISTS projects_brand_idx ON projects (brand_id);
CREATE INDEX IF NOT EXISTS brand_assets_embedding_idx
  ON brand_assets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands FORCE ROW LEVEL SECURITY;
CREATE POLICY brands_tenant_isolation ON brands
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY brands_admin_bypass ON brands FOR ALL TO app_admin USING (true);

ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY brand_assets_tenant_isolation ON brand_assets
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY brand_assets_admin_bypass ON brand_assets FOR ALL TO app_admin USING (true);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
CREATE POLICY projects_tenant_isolation ON projects
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY projects_admin_bypass ON projects FOR ALL TO app_admin USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON brands, brand_assets, projects TO app_user, app_admin;
