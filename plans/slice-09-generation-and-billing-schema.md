# Slice 09 — Generation + billing schema

**Phase:** 1 — Database schema
**Depends on:** 07, 08
**Spec references:** [Spec § 1.2 (generations, generation_variants, caption_jobs, credit_ledger_entries, subscriptions)](../specs/2026-04-25-studio-v1-spec.md), [Spec § 6 (Billing & credit ledger)](../specs/2026-04-25-studio-v1-spec.md), [decision D14, D15 (output target + inspiration image)](../../../C--personal-saas-img-gen/memory/project_decisions.md).

**Definition of done:**
- Migration `0004_generation_billing.sql` creates: `generations`, `generation_variants`, `caption_jobs`, `credit_ledger_entries`, `subscriptions`
- `inspiration_image_s3_key` and `inspiration_influence` columns on `generations`
- `idempotency_key` UNIQUE constraint on `credit_ledger_entries`
- `stripe_event_id` UNIQUE-where-not-null on `credit_ledger_entries`
- RLS on all five
- Indexes per spec § 1.4
- CI integration job enabled (workflow flag flip)

---

## Files

**Create:**
- `packages/db/src/schema/generation.ts`
- `packages/db/src/schema/billing.ts`
- `packages/db/src/migrations/0004_generation_billing.sql`

**Modify:**
- `packages/db/src/schema/index.ts`
- `.github/workflows/ci.yaml` (enable integration job)

---

## Tasks

- [ ] **Step 1 — Create `packages/db/src/schema/generation.ts`**

```ts
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { workspaces } from "./identity.js";
import { brands, projects } from "./brand.js";
import { moods, templates } from "./catalog.js";

export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  moodId: uuid("mood_id").references(() => moods.id, { onDelete: "set null" }),
  brief: text("brief").notNull(),
  settings: jsonb("settings").notNull(),
  inspirationImageS3Key: text("inspiration_image_s3_key"),
  inspirationInfluence: text("inspiration_influence", { enum: ["subtle", "balanced", "strong"] }),
  priceBookVersion: integer("price_book_version").notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).notNull().default("pending"),
  requestedByUserId: uuid("requested_by_user_id").notNull(),
  errorPayload: jsonb("error_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const generationVariants = pgTable("generation_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  generationId: uuid("generation_id").notNull().references(() => generations.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").notNull().references(() => templates.id),
  modelUsed: text("model_used"),
  outputS3Key: text("output_s3_key"),
  backgroundS3Key: text("background_s3_key"),
  creditCost: integer("credit_cost").notNull().default(0),
  renderMs: integer("render_ms"),
  status: text("status", {
    enum: ["queued", "running", "completed", "failed", "failed_safety"],
  }).notNull().default("queued"),
  errorPayload: jsonb("error_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const captionJobs = pgTable("caption_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  generationId: uuid("generation_id").references(() => generations.id, { onDelete: "set null" }),
  brief: text("brief").notNull(),
  voice: text("voice"),
  lengthTier: text("length_tier", { enum: ["short", "medium", "long"] }).notNull(),
  outputText: text("output_text"),
  creditCost: integer("credit_cost").notNull().default(0),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).notNull().default("pending"),
  errorPayload: jsonb("error_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
```

- [ ] **Step 2 — Create `packages/db/src/schema/billing.ts`**

```ts
import { integer, jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

import { workspaces } from "./identity.js";
import { generations } from "./generation.js";

export const creditLedgerEntries = pgTable(
  "credit_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["grant", "reservation", "commit", "release", "topup", "refund", "adjustment"],
    }).notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    generationId: uuid("generation_id").references(() => generations.id, { onDelete: "set null" }),
    captionJobId: uuid("caption_job_id"),
    stripeEventId: text("stripe_event_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idemUnique: uniqueIndex("ledger_idem_unique").on(t.idempotencyKey),
    stripeUnique: uniqueIndex("ledger_stripe_event_unique").on(t.stripeEventId),
  }),
);

export const subscriptions = pgTable("subscriptions", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  planCode: text("plan_code", {
    enum: ["free", "starter", "pro", "business", "agency"],
  }).notNull(),
  status: text("status").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3 — Update `packages/db/src/schema/index.ts`**

```ts
export * from "./identity.js";
export * from "./brand.js";
export * from "./catalog.js";
export * from "./generation.js";
export * from "./billing.js";
```

- [ ] **Step 4 — Generate migration + add RLS edits**

```bash
pnpm --filter @studio/db exec drizzle-kit generate --name=generation_billing
```

Edit `0004_generation_billing.sql`. Append:

```sql
-- Indexes per spec § 1.4
CREATE INDEX generations_workspace_idx ON generations (workspace_id, created_at DESC);
CREATE INDEX generations_running_idx ON generations (status) WHERE status IN ('pending','running');
CREATE INDEX generation_variants_gen_idx ON generation_variants (generation_id);
CREATE INDEX caption_jobs_workspace_idx ON caption_jobs (workspace_id, created_at DESC);
CREATE INDEX ledger_workspace_idx ON credit_ledger_entries (workspace_id, created_at DESC);

-- RLS
ALTER TABLE generations ENABLE ROW LEVEL SECURITY; ALTER TABLE generations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON generations FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON generations FOR ALL TO app_admin USING (true);

ALTER TABLE generation_variants ENABLE ROW LEVEL SECURITY; ALTER TABLE generation_variants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON generation_variants FOR ALL TO app_user
  USING (generation_id IN (SELECT id FROM generations WHERE workspace_id = current_setting('app.current_workspace_id', true)::uuid));
CREATE POLICY admin_bypass ON generation_variants FOR ALL TO app_admin USING (true);

ALTER TABLE caption_jobs ENABLE ROW LEVEL SECURITY; ALTER TABLE caption_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON caption_jobs FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON caption_jobs FOR ALL TO app_admin USING (true);

ALTER TABLE credit_ledger_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE credit_ledger_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON credit_ledger_entries FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON credit_ledger_entries FOR ALL TO app_admin USING (true);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY; ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON subscriptions FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON subscriptions FOR ALL TO app_admin USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON generations, generation_variants, caption_jobs, credit_ledger_entries, subscriptions
  TO app_user, app_admin;
```

- [ ] **Step 5 — Run migration**

```bash
pnpm --filter @studio/db db:migrate
```

- [ ] **Step 6 — Enable CI integration job**

In `.github/workflows/ci.yaml`, change `if: false` to `if: true` for the `integration` job, and replace its body with:

```yaml
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_USER: studio, POSTGRES_PASSWORD: dev, POSTGRES_DB: studio }
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U studio" --health-interval 5s --health-timeout 3s --health-retries 10
    env:
      DATABASE_URL: postgres://studio:dev@localhost:5432/studio
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: "${{ env.PNPM_VERSION }}" }
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @studio/db db:migrate
      - run: pnpm test:int
```

- [ ] **Step 7 — Commit**

```bash
git add -A
git commit -m "feat(db): generation + billing schema with RLS, idempotency keys, and CI int job enabled"
```

---

## Verification

```bash
pnpm --filter @studio/db db:migrate
pnpm test:int
psql "$DATABASE_URL" -c "\d credit_ledger_entries" | grep idempotency_key
```

## Commit message

```
feat(db): generation + billing schema with RLS, idempotency keys, and CI int job enabled
```
