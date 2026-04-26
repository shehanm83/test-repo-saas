# Slice 07 — Brand schema

**Phase:** 1 — Database schema
**Depends on:** 06
**Spec references:** [Spec § 1.2 (brands, brand_assets, projects)](../specs/2026-04-25-studio-v1-spec.md), [Spec § 1.4 (indexes)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- Migration `0002_brand.sql` creates `brands`, `brand_assets`, `projects`
- `pgvector` extension created (if not already)
- RLS policies on all three
- Tenancy property tests extended to cover the new tables

---

## Files

**Create:**
- `packages/db/src/schema/brand.ts`
- `packages/db/src/migrations/0002_brand.sql` (generated, edited for RLS + extension)
- `packages/db/src/schema/brand.int.test.ts`

**Modify:**
- `packages/db/src/schema/index.ts` (re-export)

---

## Tasks

- [ ] **Step 1 — Create `packages/db/src/schema/brand.ts`**

```ts
import { sql } from "drizzle-orm";
import { customType, integer, jsonb, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";

import { workspaces } from "./identity.js";

const palette = jsonb("palette").$type<{ primary: string; secondary?: string; accent?: string; extras?: string[] }>();
const fonts = jsonb("fonts").$type<{ heading: { family: string; weight?: string }; body: { family: string; weight?: string } }>();

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  logoS3Key: text("logo_s3_key"),
  palette,
  fonts,
  voiceNotes: text("voice_notes"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const brandAssets = pgTable("brand_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["logo", "reference", "icon"] }).notNull(),
  s3Key: text("s3_key").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2 — Update `packages/db/src/schema/index.ts`**

```ts
export * from "./identity.js";
export * from "./brand.js";
```

- [ ] **Step 3 — Generate migration**

```bash
pnpm --filter @studio/db exec drizzle-kit generate --name=brand
```

- [ ] **Step 4 — Edit generated migration**

Rename file to `0002_brand.sql`. Prepend extension creation, append RLS:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- ... drizzle-generated CREATE TABLE statements remain ...

-- Indexes
CREATE INDEX brands_workspace_idx ON brands (workspace_id, created_at DESC);
CREATE INDEX brand_assets_brand_idx ON brand_assets (brand_id);
CREATE INDEX projects_brand_idx ON projects (brand_id);
CREATE INDEX brand_assets_embedding_idx ON brand_assets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY; ALTER TABLE brands FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON brands FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON brands FOR ALL TO app_admin USING (true);

ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY; ALTER TABLE brand_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON brand_assets FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON brand_assets FOR ALL TO app_admin USING (true);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY; ALTER TABLE projects FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON projects FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON projects FOR ALL TO app_admin USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON brands, brand_assets, projects TO app_user, app_admin;
```

- [ ] **Step 5 — Migration test**

`packages/db/src/schema/brand.int.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { createDb } from "../client.js";
import { brands, workspaces, users } from "./index.js";
import { withWorkspace } from "../with-workspace.js";

const url = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5432/studio";
const adminDb = createDb(url, "app_admin");
const userDb = createDb(url, "app_user");

describe("brand RLS", () => {
  it("brand of workspace B not visible from workspace A scope", async () => {
    const [u] = await adminDb.insert(users).values({ email: `t-${Date.now()}@x.test` }).returning();
    const [a] = await adminDb.insert(workspaces).values({ ownerUserId: u.id, name: "A" }).returning();
    const [b] = await adminDb.insert(workspaces).values({ ownerUserId: u.id, name: "B" }).returning();
    await adminDb.insert(brands).values({ workspaceId: b.id, name: "B-brand" });

    const visible = await withWorkspace(userDb, a.id, async (tx) =>
      tx.execute(sql`SELECT name FROM brands`),
    );
    expect(visible.length).toBe(0);
  });
});
```

- [ ] **Step 6 — Run migration + tests**

```bash
pnpm --filter @studio/db db:migrate
pnpm --filter @studio/db test:int
```
Expected: green.

- [ ] **Step 7 — Commit**

```bash
git add -A
git commit -m "feat(db): brand schema (brands, assets, projects) with RLS + pgvector"
```

---

## Verification

```bash
psql "$DATABASE_URL" -c "\dt brand*"
psql "$DATABASE_URL" -c "\d brand_assets" | grep embedding
pnpm --filter @studio/db test:int
```

## Commit message

```
feat(db): brand schema (brands, assets, projects) with RLS + pgvector
```
