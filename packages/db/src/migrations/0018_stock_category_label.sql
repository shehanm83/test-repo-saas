-- Drop existing table (fresh production — no data to preserve)
DROP TABLE IF EXISTS stock_assets CASCADE;

CREATE TABLE stock_assets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text        NOT NULL,
  kind        text        NOT NULL DEFAULT 'icon',
  label       text        NOT NULL,
  s3_key      text        NOT NULL,
  mime_type   text        NOT NULL,
  width       integer,
  height      integer,
  tags        text[]      NOT NULL DEFAULT ARRAY[]::text[],
  embedding   vector(1536),
  license     text,
  attribution text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stock_embedding_idx
  ON stock_assets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE stock_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY stock_user_read  ON stock_assets FOR SELECT TO app_user  USING (true);
CREATE POLICY stock_admin_all  ON stock_assets FOR ALL    TO app_admin USING (true);

GRANT SELECT ON stock_assets TO app_user;
GRANT ALL    ON stock_assets TO app_admin;
