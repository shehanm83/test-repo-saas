# Slice 06 — Drizzle ORM + identity schema + RLS

**Phase:** 1 — Database schema
**Depends on:** 05
**Spec references:** [Spec § 1.2 (workspaces, workspace_members, audit_log, users)](../specs/2026-04-25-studio-v1-spec.md), [Spec § 2 (multi-tenancy enforcement)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- Drizzle ORM installed and configured against Postgres on Neon-style URL
- Migration runner script (`pnpm db:migrate`) works against local Postgres
- First migration creates `users`, `workspaces`, `workspace_members`, `audit_log` tables
- RLS enabled + policies on all tenant tables
- `app_user` and `app_admin` DB roles created (RLS enforced for app_user)
- Helper `withWorkspace(workspaceId, fn)` opens a tx, sets `app.current_workspace_id`, runs fn
- Property test `tenancy.test.ts` proves cross-tenant reads return 0 rows from app_user role
- Drizzle generated types exported from `@studio/db`

---

## Files

**Create:**
- `packages/db/drizzle.config.ts`
- `packages/db/src/client.ts`
- `packages/db/src/schema/identity.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/src/migrations/0001_identity.sql` (generated, edited for RLS)
- `packages/db/src/with-workspace.ts`
- `packages/db/src/with-workspace.test.ts` (integration, requires running Postgres)
- `packages/db/scripts/migrate.ts`
- `packages/db/scripts/seed-roles.sql`
- `packages/db/vitest.integration.config.ts`

**Modify:**
- `packages/db/package.json` (deps + scripts)

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @studio/db add drizzle-orm postgres
pnpm --filter @studio/db add -D drizzle-kit @types/pg
```

- [ ] **Step 2 — Create `packages/db/drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5432/studio",
  },
  strict: true,
  verbose: true,
});
```

- [ ] **Step 3 — Create `packages/db/src/client.ts`**

```ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema/index.js";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(databaseUrl: string, role: "app_user" | "app_admin" = "app_user"): Db {
  const sql = postgres(databaseUrl, {
    onnotice: () => undefined,
    transform: { undefined: null },
    connection: { application_name: `studio-${role}` },
  });
  return drizzle(sql, { schema });
}

export { schema };
```

- [ ] **Step 4 — Create `packages/db/src/schema/identity.ts`**

```ts
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique(),
  email: text("email").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  planCode: text("plan_code", {
    enum: ["free", "starter", "pro", "business", "agency"],
  })
    .notNull()
    .default("free"),
  brandQuota: text("brand_quota").notNull().default("1"),
  seatQuota: text("seat_quota").notNull().default("1"),
  monthlyCreditGrant: text("monthly_credit_grant").notNull().default("30"),
  stripeCustomerId: text("stripe_customer_id"),
  status: text("status", { enum: ["active", "read_only", "suspended", "deleted"] })
    .notNull()
    .default("active"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "admin", "editor", "viewer"] }).notNull(),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptInviteToken: text("accept_invite_token"),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id"),
  action: text("action").notNull(),
  target: text("target"),
  payload: text("payload"),
  isAdminAction: boolean("is_admin_action").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 5 — Create `packages/db/src/schema/index.ts`**

```ts
export * from "./identity.js";
```

- [ ] **Step 6 — Generate migration SQL and edit it for RLS**

```bash
pnpm --filter @studio/db exec drizzle-kit generate --name=identity
```

Open the generated SQL file at `packages/db/src/migrations/0001_*.sql` and rename to `0001_identity.sql`. Append RLS setup at the bottom:

```sql
-- ROLES
CREATE ROLE app_user NOLOGIN;
CREATE ROLE app_admin NOLOGIN;
GRANT app_user TO CURRENT_USER;
GRANT app_admin TO CURRENT_USER;

-- Tenant tables (workspace_id-scoped) — RLS enforced
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workspace_members
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON workspace_members FOR ALL TO app_admin USING (true);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_self ON workspaces
  FOR ALL TO app_user
  USING (id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON workspaces FOR ALL TO app_admin USING (true);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_log
  FOR ALL TO app_user
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
CREATE POLICY admin_bypass ON audit_log FOR ALL TO app_admin USING (true);

-- users is global (Clerk-mirrored). Enable RLS but app_user can only read own row.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY user_self ON users
  FOR ALL TO app_user
  USING (id = current_setting('app.current_user_id', true)::uuid);
CREATE POLICY admin_bypass ON users FOR ALL TO app_admin USING (true);

-- Grants
GRANT USAGE ON SCHEMA public TO app_user, app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user, app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user, app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user, app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user, app_admin;
```

- [ ] **Step 7 — Create `packages/db/scripts/migrate.ts`**

```ts
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "src/migrations" });
console.warn("migrations applied");
await sql.end();
```

- [ ] **Step 8 — Add scripts to `packages/db/package.json`**

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx scripts/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "test:int": "vitest run --config vitest.integration.config.ts"
  }
}
```

Add tsx:
```bash
pnpm --filter @studio/db add -D tsx
```

- [ ] **Step 9 — Implement `packages/db/src/with-workspace.ts`**

```ts
import { sql } from "drizzle-orm";
import { type Db } from "./client.js";

/**
 * Opens a transaction, sets `app.current_workspace_id` (and `app.current_user_id` if provided),
 * and runs the callback inside it. RLS policies will scope all queries to the workspace.
 */
export async function withWorkspace<T>(
  db: Db,
  workspaceId: string,
  fn: (tx: Db) => Promise<T>,
  userId?: string,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.current_workspace_id = ${workspaceId}`);
    if (userId) {
      await tx.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
    }
    return fn(tx as unknown as Db);
  });
}
```

- [ ] **Step 10 — Create integration test config `packages/db/vitest.integration.config.ts`**

```ts
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "db-int",
    globals: true,
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
```

- [ ] **Step 11 — Write failing tenancy isolation test**

`packages/db/src/with-workspace.int.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";

import { createDb } from "./client.js";
import { workspaces, workspaceMembers, users } from "./schema/identity.js";
import { withWorkspace } from "./with-workspace.js";

const url = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5432/studio";
const adminDb = createDb(url, "app_admin");
const userDb = createDb(url, "app_user");

let userA = "";
let userB = "";
let wsA = "";
let wsB = "";

beforeAll(async () => {
  // create two users + workspaces via admin role
  const [a] = await adminDb.insert(users).values({ email: "a@test.local" }).returning();
  const [b] = await adminDb.insert(users).values({ email: "b@test.local" }).returning();
  userA = a.id;
  userB = b.id;

  const [wA] = await adminDb.insert(workspaces).values({ ownerUserId: userA, name: "A" }).returning();
  const [wB] = await adminDb.insert(workspaces).values({ ownerUserId: userB, name: "B" }).returning();
  wsA = wA.id;
  wsB = wB.id;

  await adminDb.insert(workspaceMembers).values([
    { workspaceId: wsA, userId: userA, role: "owner" },
    { workspaceId: wsB, userId: userB, role: "owner" },
  ]);
});

afterAll(async () => {
  await adminDb.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, wsA));
  await adminDb.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, wsB));
  await adminDb.delete(workspaces).where(eq(workspaces.id, wsA));
  await adminDb.delete(workspaces).where(eq(workspaces.id, wsB));
  await adminDb.delete(users).where(eq(users.id, userA));
  await adminDb.delete(users).where(eq(users.id, userB));
});

describe("RLS tenancy", () => {
  it("workspace A scope cannot see workspace B members", async () => {
    const rows = await withWorkspace(userDb, wsA, async (tx) =>
      tx.execute(sql`SELECT id FROM workspace_members WHERE workspace_id = ${wsB}`),
    );
    expect(rows.length).toBe(0);
  });

  it("workspace A scope CAN see its own members", async () => {
    const rows = await withWorkspace(userDb, wsA, async (tx) =>
      tx.execute(sql`SELECT id FROM workspace_members`),
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 12 — Run migrations**

```bash
DATABASE_URL=postgres://studio:dev@localhost:5432/studio pnpm --filter @studio/db db:migrate
```

- [ ] **Step 13 — Run integration tests, expect pass**

```bash
DATABASE_URL=postgres://studio:dev@localhost:5432/studio pnpm --filter @studio/db test:int
```

- [ ] **Step 14 — Update root `vitest.integration.config.ts` (new file)**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.int.test.ts", "apps/*/src/**/*.int.test.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
```

- [ ] **Step 15 — Update `packages/db/src/index.ts`**

```ts
export * from "./client.js";
export * from "./schema/index.js";
export * from "./with-workspace.js";
```

- [ ] **Step 16 — Commit**

```bash
git add -A
git commit -m "feat(db): drizzle setup + identity schema + RLS + tenancy isolation tests"
```

---

## Verification

```bash
pnpm --filter @studio/db db:migrate   # exits 0
pnpm --filter @studio/db test:int     # 2 RLS tests pass
psql "$DATABASE_URL" -c "\dt"         # 4 tables exist
psql "$DATABASE_URL" -c "\du"         # app_user and app_admin roles exist
```

## Commit message

```
feat(db): drizzle setup + identity schema + RLS + tenancy isolation tests
```
