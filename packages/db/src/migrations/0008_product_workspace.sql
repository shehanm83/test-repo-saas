CREATE TABLE IF NOT EXISTS product_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  description text,
  target_audience text,
  default_currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_line_id uuid REFERENCES product_lines(id) ON DELETE SET NULL,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand_label text,
  model text,
  sku text,
  category text,
  title text,
  subtitle text,
  description text,
  price_minor integer,
  compare_at_price_minor integer,
  currency text NOT NULL DEFAULT 'USD',
  discount_text text,
  key_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_audience text,
  variant_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  color text,
  size text,
  material text,
  flavor text,
  package_quantity text,
  price_minor integer,
  compare_at_price_minor integer,
  currency text,
  asset_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  kind text NOT NULL,
  s3_key text NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  bytes integer,
  has_transparency boolean NOT NULL DEFAULT false,
  background_removed boolean NOT NULL DEFAULT false,
  quality_score integer,
  label_visibility text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_lines_workspace_idx
  ON product_lines (workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS product_lines_brand_idx
  ON product_lines (brand_id, status);
CREATE INDEX IF NOT EXISTS products_workspace_idx
  ON products (workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS products_brand_idx
  ON products (brand_id, status);
CREATE INDEX IF NOT EXISTS products_line_idx
  ON products (product_line_id, status);
CREATE INDEX IF NOT EXISTS products_text_idx
  ON products USING gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(title, '') || ' ' || coalesce(sku, '') || ' ' || coalesce(model, '')));
CREATE INDEX IF NOT EXISTS product_variants_product_idx
  ON product_variants (product_id, status);
CREATE INDEX IF NOT EXISTS product_assets_product_idx
  ON product_assets (product_id, kind, created_at DESC);

ALTER TABLE product_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY product_lines_tenant_isolation ON product_lines
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY product_lines_admin_bypass ON product_lines FOR ALL TO app_admin USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY products_tenant_isolation ON products
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY products_admin_bypass ON products FOR ALL TO app_admin USING (true);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;
CREATE POLICY product_variants_tenant_isolation ON product_variants
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY product_variants_admin_bypass ON product_variants FOR ALL TO app_admin USING (true);

ALTER TABLE product_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY product_assets_tenant_isolation ON product_assets
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY product_assets_admin_bypass ON product_assets FOR ALL TO app_admin USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON product_lines, products, product_variants, product_assets
  TO app_user, app_admin;
