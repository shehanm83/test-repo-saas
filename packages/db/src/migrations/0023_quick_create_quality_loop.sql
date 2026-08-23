ALTER TABLE generation_variants
  ADD COLUMN IF NOT EXISTS parent_variant_id uuid REFERENCES generation_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refinement_spec jsonb,
  ADD COLUMN IF NOT EXISTS qa_status text CHECK (qa_status IN ('pending', 'passed', 'soft_failed', 'hard_failed', 'unavailable')),
  ADD COLUMN IF NOT EXISTS qa_result jsonb,
  ADD COLUMN IF NOT EXISTS qa_rank integer,
  ADD COLUMN IF NOT EXISTS auto_retry_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS generation_variants_parent_idx
  ON generation_variants (parent_variant_id);
CREATE INDEX IF NOT EXISTS generation_variants_qa_rank_idx
  ON generation_variants (generation_id, qa_rank DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS quick_create_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quick_create_drafts_workspace_user_unique UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS generation_variant_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES generation_variants(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('up', 'down')),
  reason text CHECK (reason IN ('wrong_product', 'not_my_idea', 'bad_composition', 'brand_mismatch', 'text_problem', 'other')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generation_variant_feedback_workspace_user_variant_unique
    UNIQUE (workspace_id, user_id, variant_id)
);

ALTER TABLE quick_create_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_create_drafts FORCE ROW LEVEL SECURITY;
CREATE POLICY quick_create_drafts_user_all ON quick_create_drafts FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid
    AND user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)::uuid
    AND user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY quick_create_drafts_admin_all ON quick_create_drafts FOR ALL TO app_admin USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON quick_create_drafts TO app_user;
GRANT ALL ON quick_create_drafts TO app_admin;

ALTER TABLE generation_variant_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_variant_feedback FORCE ROW LEVEL SECURITY;
CREATE POLICY generation_variant_feedback_user_all ON generation_variant_feedback FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid
    AND user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)::uuid
    AND user_id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY generation_variant_feedback_admin_all ON generation_variant_feedback FOR ALL TO app_admin USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON generation_variant_feedback TO app_user;
GRANT ALL ON generation_variant_feedback TO app_admin;
