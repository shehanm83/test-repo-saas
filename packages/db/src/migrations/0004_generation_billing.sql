CREATE TABLE IF NOT EXISTS generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  mood_id uuid REFERENCES moods(id) ON DELETE SET NULL,
  brief text NOT NULL,
  settings jsonb NOT NULL,
  inspiration_image_s3_key text,
  inspiration_influence text,
  price_book_version integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by_user_id uuid NOT NULL,
  error_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS generation_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id),
  model_used text,
  output_s3_key text,
  background_s3_key text,
  credit_cost integer NOT NULL DEFAULT 0,
  render_ms integer,
  status text NOT NULL DEFAULT 'queued',
  error_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS caption_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  generation_id uuid REFERENCES generations(id) ON DELETE SET NULL,
  brief text NOT NULL,
  voice text,
  length_tier text NOT NULL,
  output_text text,
  credit_cost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS credit_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  generation_id uuid REFERENCES generations(id) ON DELETE SET NULL,
  caption_job_id uuid,
  stripe_event_id text,
  idempotency_key text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ledger_idem_unique ON credit_ledger_entries (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_stripe_event_unique
  ON credit_ledger_entries (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS subscriptions (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL,
  plan_code text NOT NULL,
  status text NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generations_workspace_idx ON generations (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generations_running_idx
  ON generations (status)
  WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS generation_variants_gen_idx ON generation_variants (generation_id);
CREATE INDEX IF NOT EXISTS caption_jobs_workspace_idx ON caption_jobs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ledger_workspace_idx ON credit_ledger_entries (workspace_id, created_at DESC);

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations FORCE ROW LEVEL SECURITY;
CREATE POLICY generations_tenant_isolation ON generations
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY generations_admin_bypass ON generations FOR ALL TO app_admin USING (true);

ALTER TABLE generation_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_variants FORCE ROW LEVEL SECURITY;
CREATE POLICY generation_variants_tenant_isolation ON generation_variants
  FOR ALL TO app_user
  USING (
    generation_id IN (
      SELECT id FROM generations
      WHERE workspace_id = current_setting('app.current_workspace_id', true)::uuid
    )
  );
CREATE POLICY generation_variants_admin_bypass ON generation_variants FOR ALL TO app_admin USING (true);

ALTER TABLE caption_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE caption_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY caption_jobs_tenant_isolation ON caption_jobs
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY caption_jobs_admin_bypass ON caption_jobs FOR ALL TO app_admin USING (true);

ALTER TABLE credit_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY credit_ledger_entries_tenant_isolation ON credit_ledger_entries
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY credit_ledger_entries_admin_bypass ON credit_ledger_entries FOR ALL TO app_admin USING (true);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_tenant_isolation ON subscriptions
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY subscriptions_admin_bypass ON subscriptions FOR ALL TO app_admin USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON generations, generation_variants, caption_jobs, credit_ledger_entries, subscriptions
  TO app_user, app_admin;
