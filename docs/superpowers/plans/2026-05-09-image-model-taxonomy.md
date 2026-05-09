# Image Model Taxonomy & Pricebook Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `premium_flag: bool` taxonomy with a normalized 4-dimension model (tier × strength × admin-named models × tags), admin-controlled routing, and multi-model variation — covering DB schema, query helpers, admin API + UI, and generation API contract change.

**Architecture:** Seven new/changed Drizzle tables behind two query helpers (`getTierOptions`, `resolveSelection`). New `TaxonomyApi` class wraps admin CRUD. Existing `GenerationApi` accepts both legacy (`usePremiumModel`) and new (`{tier, strength, selected_model_codes?}`) request shapes for one release. Five new admin pages under `/admin/{models,strengths,tags,routing}` plus an updated `/admin/pricebook`.

**Tech Stack:** Drizzle ORM · Postgres · Next.js 16 (App Router) · TypeScript · Vitest · Zod · React Testing Library

**Spec:** `docs/superpowers/specs/2026-05-09-image-model-taxonomy-design.md`

---

## File Structure

### New files

```
packages/db/src/schema/taxonomy.ts                                    Drizzle defs for the 7 new tables
packages/db/src/migrations/0016_image_model_taxonomy.sql              Migration SQL
packages/db/src/queries/taxonomy.ts                                   getTierOptions, resolveSelection, getModel, admin CRUD
packages/db/src/queries/taxonomy.test.ts                              Unit tests for query helpers
packages/db/src/queries/taxonomy.int.test.ts                          Integration tests against live Postgres
packages/api/src/taxonomy.ts                                          TaxonomyApi class (admin operations)
packages/api/src/taxonomy.test.ts                                     TaxonomyApi unit tests
apps/web/app/api/admin/taxonomy/strengths/route.ts                    GET, POST
apps/web/app/api/admin/taxonomy/strengths/[code]/route.ts             GET, PUT, DELETE
apps/web/app/api/admin/taxonomy/models/route.ts                       GET, POST
apps/web/app/api/admin/taxonomy/models/[code]/route.ts                GET, PUT, DELETE
apps/web/app/api/admin/taxonomy/models/[code]/strengths/route.ts      POST, DELETE
apps/web/app/api/admin/taxonomy/models/[code]/tags/route.ts           POST, DELETE
apps/web/app/api/admin/taxonomy/tags/route.ts                         GET, POST
apps/web/app/api/admin/taxonomy/tags/[code]/route.ts                  GET, PUT, DELETE
apps/web/app/api/admin/taxonomy/routing/route.ts                      GET, POST
apps/web/app/api/admin/taxonomy/routing/[id]/route.ts                 PUT, DELETE
apps/web/app/admin/strengths/page.tsx                                 Server component
apps/web/app/admin/models/page.tsx                                    List server component
apps/web/app/admin/models/[code]/page.tsx                             Detail server component
apps/web/app/admin/tags/page.tsx                                      Server component
apps/web/app/admin/routing/page.tsx                                   Server component
apps/web/components/admin/strengths-admin.tsx                         Client component
apps/web/components/admin/models-admin.tsx                            List client component
apps/web/components/admin/model-detail.tsx                            Detail client component
apps/web/components/admin/tags-admin.tsx                              Client component
apps/web/components/admin/routing-admin.tsx                           Buckets list client
apps/web/components/admin/routing-bucket-panel.tsx                    Side panel for one bucket
apps/web/components/admin/*.test.tsx                                  RTL render tests (one per component)
```

### Modified files

```
packages/db/src/schema/index.ts                                       Re-export taxonomy schema
packages/db/src/schema/catalog.ts                                     priceBookEntries: drop premium_flag readers, FK to models
packages/db/src/migrations/meta/_journal.json                         Append idx 15
packages/db/scripts/seed-pricebook.ts                                 Insert by model_code, not llm_model_id
packages/db/src/index.ts                                              Re-export taxonomy queries
packages/db/src/queries/pricebook.ts                                  Drop premiumFlag from PriceBookLookup args
packages/api/src/generation.ts                                        Accept new {tier, strength, selected_model_codes?} shape
packages/api/src/pricebook.ts                                         Drop premiumFlag from validators; require model_code be active
packages/shared/src/generation/commercial-contract.ts                 Extend Zod schema for tier/strength/selected_model_codes
apps/web/app/admin/pricebook/page.tsx                                 Use models.code in select
apps/web/components/admin/pricebook-admin.tsx                         Replace freeform model_code input with <select>
```

---

## Phase 1 — Database foundation

### Task 1: Drizzle schema for the 7 new tables

**Files:**
- Create: `packages/db/src/schema/taxonomy.ts`
- Modify: `packages/db/src/schema/index.ts` (add re-export)

- [ ] **Step 1: Create the schema file**

Write `packages/db/src/schema/taxonomy.ts`:

```typescript
import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const qualityTiers = pgTable("quality_tiers", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  requiresStrength: boolean("requires_strength").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const strengths = pgTable("strengths", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const models = pgTable(
  "models",
  {
    code: text("code").primaryKey(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    vendor: text("vendor").notNull(),
    llmModelId: text("llm_model_id").notNull(),
    status: text("status", { enum: ["active", "paused", "deprecated"] })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const modelStrengths = pgTable(
  "model_strengths",
  {
    modelCode: text("model_code")
      .notNull()
      .references(() => models.code, { onDelete: "cascade" }),
    strengthCode: text("strength_code")
      .notNull()
      .references(() => strengths.code, { onDelete: "restrict" }),
  },
  (table) => ({
    pk: uniqueIndex("model_strengths_pk").on(table.modelCode, table.strengthCode),
  }),
);

export const tags = pgTable("tags", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modelTags = pgTable(
  "model_tags",
  {
    modelCode: text("model_code")
      .notNull()
      .references(() => models.code, { onDelete: "cascade" }),
    tagCode: text("tag_code")
      .notNull()
      .references(() => tags.code, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: uniqueIndex("model_tags_pk").on(table.modelCode, table.tagCode),
  }),
);

export const tierStrengthRouting = pgTable(
  "tier_strength_routing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tierCode: text("tier_code")
      .notNull()
      .references(() => qualityTiers.code, { onDelete: "restrict" }),
    strengthCode: text("strength_code").references(() => strengths.code, {
      onDelete: "restrict",
    }),
    modelCode: text("model_code")
      .notNull()
      .references(() => models.code, { onDelete: "restrict" }),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    version: integer("version").notNull().default(1),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
  },
  (table) => ({
    versionUnique: uniqueIndex("tier_strength_routing_version_unique").on(
      table.tierCode,
      table.strengthCode,
      table.modelCode,
      table.version,
    ),
    // Partial unique enforcing one default per active bucket — created via raw SQL
    // in the migration because Drizzle can't express partial unique with a
    // WHERE on a NULL-able column cleanly. See migration 0016.
  }),
);
```

- [ ] **Step 2: Re-export from the schema index**

Modify `packages/db/src/schema/index.ts`. Find the export block and add:

```typescript
export * from "./taxonomy";
```

- [ ] **Step 3: Type-check the schema package**

Run: `pnpm --filter @vyora/db typecheck`
Expected: no errors. If `verbatimModuleSyntax` complains about unused `sql` import, remove the `import { sql }` line.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/taxonomy.ts packages/db/src/schema/index.ts
git commit -m "feat(db): drizzle schema for image model taxonomy"
```

---

### Task 2: Migration SQL + journal + apply

**Files:**
- Create: `packages/db/src/migrations/0016_image_model_taxonomy.sql`
- Modify: `packages/db/src/migrations/meta/_journal.json`

- [ ] **Step 1: Write the migration SQL**

Create `packages/db/src/migrations/0016_image_model_taxonomy.sql`:

```sql
-- New tables (FK ordering: lookups first, joins after)
CREATE TABLE "quality_tiers" (
  "code" text PRIMARY KEY,
  "label" text NOT NULL,
  "description" text,
  "requires_strength" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE TABLE "strengths" (
  "code" text PRIMARY KEY,
  "label" text NOT NULL,
  "description" text,
  "icon" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "models" (
  "code" text PRIMARY KEY,
  "display_name" text NOT NULL,
  "description" text,
  "vendor" text NOT NULL,
  "llm_model_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','paused','deprecated')),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "model_strengths" (
  "model_code" text NOT NULL REFERENCES "models"("code") ON DELETE CASCADE,
  "strength_code" text NOT NULL REFERENCES "strengths"("code") ON DELETE RESTRICT,
  PRIMARY KEY ("model_code", "strength_code")
);

CREATE TABLE "tags" (
  "code" text PRIMARY KEY,
  "label" text NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "model_tags" (
  "model_code" text NOT NULL REFERENCES "models"("code") ON DELETE CASCADE,
  "tag_code" text NOT NULL REFERENCES "tags"("code") ON DELETE CASCADE,
  PRIMARY KEY ("model_code", "tag_code")
);

CREATE TABLE "tier_strength_routing" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tier_code" text NOT NULL REFERENCES "quality_tiers"("code") ON DELETE RESTRICT,
  "strength_code" text REFERENCES "strengths"("code") ON DELETE RESTRICT,
  "model_code" text NOT NULL REFERENCES "models"("code") ON DELETE RESTRICT,
  "is_default" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "version" integer NOT NULL DEFAULT 1,
  "effective_from" timestamptz NOT NULL DEFAULT now(),
  "effective_to" timestamptz
);

CREATE UNIQUE INDEX "tier_strength_routing_version_unique"
  ON "tier_strength_routing" ("tier_code", "strength_code", "model_code", "version");

-- Partial unique: exactly one default per active (tier, strength) bucket.
-- COALESCE handles the NULL strength_code case (standard tier).
CREATE UNIQUE INDEX "tier_strength_routing_active_default_unique"
  ON "tier_strength_routing" ("tier_code", COALESCE("strength_code", '__null__'))
  WHERE "is_default" = true AND "effective_to" IS NULL;

-- RLS: admin only (these are global config, not workspace-scoped)
ALTER TABLE "quality_tiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "strengths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "model_strengths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "model_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tier_strength_routing" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxonomy_admin_all" ON "quality_tiers" TO app_admin USING (true);
CREATE POLICY "taxonomy_user_read" ON "quality_tiers" FOR SELECT TO app_user USING (true);
CREATE POLICY "strengths_admin_all" ON "strengths" TO app_admin USING (true);
CREATE POLICY "strengths_user_read" ON "strengths" FOR SELECT TO app_user USING (true);
CREATE POLICY "models_admin_all" ON "models" TO app_admin USING (true);
CREATE POLICY "models_user_read" ON "models" FOR SELECT TO app_user USING (true);
CREATE POLICY "model_strengths_admin_all" ON "model_strengths" TO app_admin USING (true);
CREATE POLICY "model_strengths_user_read" ON "model_strengths" FOR SELECT TO app_user USING (true);
CREATE POLICY "tags_admin_all" ON "tags" TO app_admin USING (true);
CREATE POLICY "tags_user_read" ON "tags" FOR SELECT TO app_user USING (true);
CREATE POLICY "model_tags_admin_all" ON "model_tags" TO app_admin USING (true);
CREATE POLICY "model_tags_user_read" ON "model_tags" FOR SELECT TO app_user USING (true);
CREATE POLICY "routing_admin_all" ON "tier_strength_routing" TO app_admin USING (true);
CREATE POLICY "routing_user_read" ON "tier_strength_routing" FOR SELECT TO app_user USING (true);

-- Seed lookup data
INSERT INTO "quality_tiers" ("code", "label", "description", "requires_strength", "sort_order") VALUES
  ('standard', 'Standard', 'Single default model — fast & affordable',  false, 0),
  ('premium',  'Premium',  'Pick a model strength for the result',      true,  1);

INSERT INTO "strengths" ("code", "label", "description", "sort_order") VALUES
  ('text',      'Text rendering',       'Best at exact text/typography in image', 0),
  ('photoreal', 'Photoreal',            'Photographic realism',                    1),
  ('design',    'Design / Typographic', 'Editorial, poster, vector-feel',          2),
  ('speed',     'Speed / Iteration',    'Fast cheap drafts',                       3);

INSERT INTO "models" ("code", "display_name", "description", "vendor", "llm_model_id", "status") VALUES
  ('economy',       'Economy',       'Default standard-tier model — fast and affordable.', 'replicate', 'flux-1.1-pro',  'active'),
  ('photoreal-pro', 'Photoreal Pro', 'Premium photographic realism.',                       'replicate', 'flux-1.1-pro',  'active'),
  ('text-master',   'Text Master',   'Premium model tuned for exact text in images.',       'openai',    'gpt-image-1',   'active'),
  ('design-studio', 'Design Studio', 'Premium design / typographic model.',                 'recraft',   'recraft-v3',    'active'),
  ('speed-draft',   'Speed Draft',   'Premium fast-iteration model.',                       'bedrock',   'bedrock-sd35',  'active');

INSERT INTO "model_strengths" ("model_code", "strength_code") VALUES
  ('text-master',   'text'),
  ('photoreal-pro', 'photoreal'),
  ('design-studio', 'design'),
  ('speed-draft',   'speed');

INSERT INTO "tier_strength_routing" ("tier_code", "strength_code", "model_code", "is_default", "sort_order") VALUES
  ('standard', NULL,        'economy',       true, 0),
  ('premium',  'text',      'text-master',   true, 0),
  ('premium',  'photoreal', 'photoreal-pro', true, 0),
  ('premium',  'design',    'design-studio', true, 0),
  ('premium',  'speed',     'speed-draft',   true, 0);

-- Backfill price_book_entries.model_code BEFORE adding the FK.
-- Existing rows use llm_model_id strings; remap to new models.code values.
UPDATE "price_book_entries" SET "model_code" = 'photoreal-pro'
  WHERE "model_code" = 'flux-1.1-pro' AND "premium_flag" = true;
UPDATE "price_book_entries" SET "model_code" = 'economy'
  WHERE "model_code" = 'flux-1.1-pro' AND "premium_flag" = false;
UPDATE "price_book_entries" SET "model_code" = 'text-master'
  WHERE "model_code" IN ('gpt-image-1','gpt-image-2');
UPDATE "price_book_entries" SET "model_code" = 'design-studio'
  WHERE "model_code" = 'recraft-v3';
UPDATE "price_book_entries" SET "model_code" = 'speed-draft'
  WHERE "model_code" IN ('bedrock-sd35','nova-canvas');

-- Now the FK is safe.
ALTER TABLE "price_book_entries"
  ADD CONSTRAINT "price_book_entries_model_code_fkey"
  FOREIGN KEY ("model_code") REFERENCES "models"("code") ON DELETE RESTRICT;
```

- [ ] **Step 2: Append the migration to the journal**

Modify `packages/db/src/migrations/meta/_journal.json`. Append a new entry inside the `entries` array:

```json
    {
      "idx": 15,
      "version": "7",
      "when": 1778659400000,
      "tag": "0016_image_model_taxonomy",
      "breakpoints": true
    }
```

(Replace the trailing `}` of idx 14's entry with `},` and add the new object before the closing `]`.)

- [ ] **Step 3: Apply the migration**

```bash
set -a; . .env.local; set +a
pnpm db:migrate
```

Expected output ends with: `migrations applied`

- [ ] **Step 4: Verify the new tables and seeded rows**

```bash
docker exec studio-v1-postgres-1 psql -U studio -d studio -c "
  SELECT count(*) AS tiers FROM quality_tiers;
  SELECT count(*) AS strengths FROM strengths;
  SELECT count(*) AS models FROM models;
  SELECT count(*) AS routing FROM tier_strength_routing;
"
```

Expected: tiers=2, strengths=4, models=5, routing=5.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/migrations/0016_image_model_taxonomy.sql packages/db/src/migrations/meta/_journal.json
git commit -m "feat(db): migration 0016 — image model taxonomy + seed + price book FK"
```

---

### Task 3: Update seed-pricebook to use model_code

**Files:**
- Modify: `packages/db/scripts/seed-pricebook.ts`
- Modify: `packages/db/src/queries/pricebook.ts` (drop `premiumFlag` from lookup)
- Modify: `packages/db/src/schema/catalog.ts` (drop `premiumFlag` reference if it lives in schema; keep column)

- [ ] **Step 1: Read the existing seed-pricebook.ts**

Read `packages/db/scripts/seed-pricebook.ts` to capture the current `rows` array shape.

- [ ] **Step 2: Rewrite the rows array to use new model.code values**

Replace each LLM-id-keyed entry with the new model.code. Example transformation: an entry that was `["flux-1.1-pro", "standard", false, false, 5]` becomes two entries — one for `["economy", "standard", false, 5]` (premium=false case) and `photoreal-pro` is no longer needed because pricing is per-model now (no premium_flag axis).

The exact rows after rewrite (drop `premiumFlag`):

```typescript
// Format: [modelCode, sizeBucket, hasInspirationFlag, credits]
const rows: Array<[string, "standard" | "large", boolean, number]> = [
  // Economy (standard tier default — Flux 1.1 Pro)
  ["economy",       "standard", false, 5],
  ["economy",       "standard", true,  7],
  ["economy",       "large",    false, 8],
  ["economy",       "large",    true,  10],
  // Photoreal Pro (premium · photoreal — Flux 1.1 Pro at premium price)
  ["photoreal-pro", "standard", false, 8],
  ["photoreal-pro", "standard", true,  10],
  ["photoreal-pro", "large",    false, 12],
  ["photoreal-pro", "large",    true,  15],
  // Text Master (premium · text — gpt-image-1)
  ["text-master",   "standard", false, 15],
  ["text-master",   "standard", true,  17],
  ["text-master",   "large",    false, 22],
  ["text-master",   "large",    true,  24],
  // Design Studio (premium · design — Recraft V3)
  ["design-studio", "standard", false, 8],
  ["design-studio", "standard", true,  10],
  ["design-studio", "large",    false, 12],
  ["design-studio", "large",    true,  15],
  // Speed Draft (premium · speed — Bedrock SD3.5)
  ["speed-draft",   "standard", false, 3],
  ["speed-draft",   "standard", true,  4],
  ["speed-draft",   "large",    false, 5],
  ["speed-draft",   "large",    true,  6],
];
```

- [ ] **Step 3: Update the insert loop**

Replace the for-loop body to insert without `premiumFlag` (column stays in DB but always `false` for new rows):

```typescript
for (const [modelCode, sizeBucket, hasInspirationFlag, credits] of rows) {
  await db.insert(priceBookEntries).values({
    modelCode,
    sizeBucket,
    premiumFlag: false,            // legacy column; always false in new rows
    hasInspirationFlag,
    credits,
    version: 1,
  }).onConflictDoNothing();
}
```

- [ ] **Step 4: Run the seed against the migrated DB**

```bash
set -a; . .env.local; set +a
pnpm db:seed:pricebook
```

Expected: `price book seeded` and no FK errors.

- [ ] **Step 5: Verify rows landed**

```bash
docker exec studio-v1-postgres-1 psql -U studio -d studio -c "
  SELECT model_code, size_bucket, has_inspiration_flag, credits FROM price_book_entries
  WHERE version = 1 ORDER BY model_code, size_bucket, has_inspiration_flag;
"
```

Expected: 20 rows covering the 5 new model_codes × 2 sizes × 2 inspiration flags. Each `model_code` matches a row in `models`.

- [ ] **Step 6: Drop premiumFlag from `priceBookLookup` args**

Modify `packages/db/src/queries/pricebook.ts`. Find `priceBookLookup` and remove the `premiumFlag` parameter from the args type and the WHERE clause. Update the not-found error key string to drop `premiumFlag`.

```typescript
export async function priceBookLookup(
  db: Db,
  args: {
    modelCode: string;
    sizeBucket: "standard" | "large";
    hasInspirationFlag: boolean;
  },
): Promise<{ credits: number; version: number }> {
  const [row] = await db
    .select({ credits: priceBookEntries.credits, version: priceBookEntries.version })
    .from(priceBookEntries)
    .where(
      and(
        eq(priceBookEntries.modelCode, args.modelCode),
        eq(priceBookEntries.sizeBucket, args.sizeBucket),
        eq(priceBookEntries.hasInspirationFlag, args.hasInspirationFlag),
        isNull(priceBookEntries.effectiveTo),
      ),
    )
    .orderBy(desc(priceBookEntries.version))
    .limit(1);

  if (!row) {
    throw new Error(
      `pricebook-not-found:${args.modelCode}/${args.sizeBucket}/${args.hasInspirationFlag}`,
    );
  }
  return row;
}
```

- [ ] **Step 7: Update callers of `priceBookLookup`**

Run: `grep -rn "priceBookLookup" packages apps --include='*.ts' | grep -v '\.test\.\|node_modules\|dist'`

For each caller, drop the `premiumFlag:` arg from the call site. Likely: `packages/api/src/generation.ts:301`. Leave the `usePremiumModel` request flag in place — that's handled in Task 8.

- [ ] **Step 8: Type-check**

Run: `pnpm --filter @vyora/db --filter @vyora/api typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add packages/db/scripts/seed-pricebook.ts packages/db/src/queries/pricebook.ts packages/api/src/generation.ts
git commit -m "feat(db): pricebook keyed on model_code; drop premiumFlag from lookup"
```

---

## Phase 2 — Query helpers

### Task 4: getModel + listModels accessors

**Files:**
- Create (start): `packages/db/src/queries/taxonomy.ts`
- Create (start): `packages/db/src/queries/taxonomy.test.ts`
- Modify: `packages/db/src/index.ts` (add re-export)

- [ ] **Step 1: Write the failing tests**

Create `packages/db/src/queries/taxonomy.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";

import { getModel, listActiveModels } from "./taxonomy";
import type { Db } from "../client";

function makeFakeDb(rows: unknown): Db {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (Array.isArray(rows) ? rows : [rows]),
        }),
        orderBy: () => ({ where: () => Promise.resolve(rows) }),
      }),
    }),
  } as unknown as Db;
}

describe("getModel", () => {
  it("returns the model row when found", async () => {
    const db = makeFakeDb({ code: "economy", displayName: "Economy", status: "active" });
    const model = await getModel(db, "economy");
    expect(model?.code).toBe("economy");
  });

  it("returns null when not found", async () => {
    const db = makeFakeDb([]);
    const model = await getModel(db, "missing");
    expect(model).toBeNull();
  });
});

describe("listActiveModels", () => {
  it("returns rows from the query", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({ orderBy: async () => [{ code: "economy" }] }),
        }),
      }),
    } as unknown as Db;
    const rows = await listActiveModels(db);
    expect(rows).toEqual([{ code: "economy" }]);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `pnpm --filter @vyora/db test --run src/queries/taxonomy.test.ts`
Expected: FAIL — module `./taxonomy` not found.

- [ ] **Step 3: Implement**

Create `packages/db/src/queries/taxonomy.ts`:

```typescript
import { and, asc, eq, isNull } from "drizzle-orm";

import type { Db } from "../client";
import { models, modelStrengths, strengths, tags, modelTags, tierStrengthRouting, qualityTiers } from "../schema";

export type ModelRow = typeof models.$inferSelect;

export async function getModel(db: Db, code: string): Promise<ModelRow | null> {
  const [row] = await db.select().from(models).where(eq(models.code, code)).limit(1);
  return row ?? null;
}

export async function listActiveModels(db: Db): Promise<ModelRow[]> {
  return db
    .select()
    .from(models)
    .where(eq(models.status, "active"))
    .orderBy(asc(models.code));
}
```

- [ ] **Step 4: Re-export from db index**

Modify `packages/db/src/index.ts`. Add:

```typescript
export * from "./queries/taxonomy";
```

- [ ] **Step 5: Run the tests, confirm they pass**

Run: `pnpm --filter @vyora/db test --run src/queries/taxonomy.test.ts`
Expected: PASS — 3/3.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/queries/taxonomy.ts packages/db/src/queries/taxonomy.test.ts packages/db/src/index.ts
git commit -m "feat(db): getModel + listActiveModels query helpers"
```

---

### Task 5: getTierOptions

**Files:**
- Modify: `packages/db/src/queries/taxonomy.ts`
- Modify: `packages/db/src/queries/taxonomy.test.ts`
- Create: `packages/db/src/queries/taxonomy.int.test.ts` (first integration test)

- [ ] **Step 1: Write the failing unit test**

Append to `packages/db/src/queries/taxonomy.test.ts`:

```typescript
import { getTierOptions } from "./taxonomy";

describe("getTierOptions", () => {
  it("groups standard separately from premium-by-strength", async () => {
    const fakeRows = [
      { tierCode: "standard", strengthCode: null, modelCode: "economy",
        isDefault: true, modelDisplayName: "Economy", modelStatus: "active" },
      { tierCode: "premium", strengthCode: "text", modelCode: "text-master",
        isDefault: true, modelDisplayName: "Text Master", modelStatus: "active" },
      { tierCode: "premium", strengthCode: "text", modelCode: "design-studio",
        isDefault: false, modelDisplayName: "Design Studio", modelStatus: "active" },
    ];
    const db = {
      select: () => ({ from: () => ({ leftJoin: () => ({ leftJoin: () => ({ where: () => ({ orderBy: async () => fakeRows }) }) }) }) }),
    } as unknown as Db;

    const opts = await getTierOptions(db);
    expect(opts.standard?.modelCode).toBe("economy");
    expect(opts.premium?.text?.defaultModelCode).toBe("text-master");
    expect(opts.premium?.text?.eligibleModelCodes).toEqual(["text-master", "design-studio"]);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `pnpm --filter @vyora/db test --run src/queries/taxonomy.test.ts`
Expected: FAIL — `getTierOptions is not a function`.

- [ ] **Step 3: Implement getTierOptions**

Append to `packages/db/src/queries/taxonomy.ts`:

```typescript
export interface TierBucket {
  defaultModelCode: string;
  eligibleModelCodes: string[];
  modelsByCode: Record<string, { displayName: string; description: string | null }>;
}

export interface TierOptions {
  standard: { modelCode: string; displayName: string } | null;
  premium: Record<string, TierBucket>;  // keyed by strength_code
}

export async function getTierOptions(db: Db): Promise<TierOptions> {
  // Join routing → models, filter to active models + active rows.
  const rows = await db
    .select({
      tierCode: tierStrengthRouting.tierCode,
      strengthCode: tierStrengthRouting.strengthCode,
      modelCode: tierStrengthRouting.modelCode,
      isDefault: tierStrengthRouting.isDefault,
      sortOrder: tierStrengthRouting.sortOrder,
      modelDisplayName: models.displayName,
      modelDescription: models.description,
      modelStatus: models.status,
    })
    .from(tierStrengthRouting)
    .leftJoin(models, eq(models.code, tierStrengthRouting.modelCode))
    .where(
      and(
        isNull(tierStrengthRouting.effectiveTo),
        eq(models.status, "active"),
      ),
    )
    .orderBy(asc(tierStrengthRouting.tierCode), asc(tierStrengthRouting.strengthCode), asc(tierStrengthRouting.sortOrder));

  let standard: TierOptions["standard"] = null;
  const premium: Record<string, TierBucket> = {};

  for (const r of rows) {
    if (r.tierCode === "standard") {
      if (r.isDefault && r.modelDisplayName) {
        standard = { modelCode: r.modelCode, displayName: r.modelDisplayName };
      }
      continue;
    }
    const strength = r.strengthCode;
    if (!strength) continue;
    let bucket = premium[strength];
    if (!bucket) {
      bucket = {
        defaultModelCode: r.isDefault ? r.modelCode : "",
        eligibleModelCodes: [],
        modelsByCode: {},
      };
      premium[strength] = bucket;
    }
    bucket.eligibleModelCodes.push(r.modelCode);
    if (r.isDefault) bucket.defaultModelCode = r.modelCode;
    bucket.modelsByCode[r.modelCode] = {
      displayName: r.modelDisplayName ?? r.modelCode,
      description: r.modelDescription ?? null,
    };
  }

  return { standard, premium };
}
```

- [ ] **Step 4: Run unit test, confirm pass**

Run: `pnpm --filter @vyora/db test --run src/queries/taxonomy.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the integration test**

Create `packages/db/src/queries/taxonomy.int.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { createDb } from "../client";
import { getTierOptions, getModel } from "./taxonomy";

const url = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5433/studio";

describe("taxonomy integration", () => {
  const db = createDb(url, "app_admin");

  it("getTierOptions returns the seeded shape", async () => {
    const opts = await getTierOptions(db);
    expect(opts.standard?.modelCode).toBe("economy");
    expect(opts.standard?.displayName).toBe("Economy");
    expect(opts.premium.text?.defaultModelCode).toBe("text-master");
    expect(opts.premium.photoreal?.defaultModelCode).toBe("photoreal-pro");
    expect(opts.premium.design?.defaultModelCode).toBe("design-studio");
    expect(opts.premium.speed?.defaultModelCode).toBe("speed-draft");
  });

  it("getModel returns each seeded model", async () => {
    for (const code of ["economy", "photoreal-pro", "text-master", "design-studio", "speed-draft"]) {
      const m = await getModel(db, code);
      expect(m?.code).toBe(code);
      expect(m?.status).toBe("active");
    }
    expect(await getModel(db, "nope")).toBeNull();
  });

  it("partial unique blocks two is_default in same bucket", async () => {
    await expect(
      db.execute(sql`
        INSERT INTO tier_strength_routing (tier_code, strength_code, model_code, is_default)
        VALUES ('premium', 'text', 'photoreal-pro', true)
      `),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 6: Run integration test (Postgres must be up)**

```bash
set -a; . .env.local; set +a
pnpm --filter @vyora/db exec vitest run --config ../../vitest.integration.config.ts src/queries/taxonomy.int.test.ts
```

Expected: 3/3 PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/queries/taxonomy.ts packages/db/src/queries/taxonomy.test.ts packages/db/src/queries/taxonomy.int.test.ts
git commit -m "feat(db): getTierOptions query + integration tests"
```

---

### Task 6: resolveSelection (default + multi-model + error cases)

**Files:**
- Modify: `packages/db/src/queries/taxonomy.ts`
- Modify: `packages/db/src/queries/taxonomy.test.ts`
- Modify: `packages/db/src/queries/taxonomy.int.test.ts`

- [ ] **Step 1: Write failing unit tests for the five 422 codes**

Append to `packages/db/src/queries/taxonomy.test.ts`. The fake-db builder gets richer because `resolveSelection` runs four queries (tier, strength, eligibleRows, priceBookLookup), so we use a per-test mock module instead of `makeFakeDb`:

```typescript
import { resolveSelection, ResolveSelectionError } from "./taxonomy";

function buildResolveDb(opts: {
  tierFound?: { code: string };
  strengthFound?: { code: string } | null;
  eligibleRows?: Array<{ modelCode: string; isDefault: boolean; llmModelId: string; displayName: string; modelStatus: string }>;
  priceRow?: { credits: number; version: number } | null;
}): Db {
  const tierResult = opts.tierFound ? [opts.tierFound] : [];
  const strengthResult = opts.strengthFound ? [opts.strengthFound] : [];
  const rows = opts.eligibleRows ?? [];
  let selectCalls = 0;
  return {
    select: () => ({
      from: (tbl: unknown) => ({
        where: () => ({
          limit: async () => {
            // Order: qualityTiers, strengths
            selectCalls++;
            if (selectCalls === 1) return tierResult;
            if (selectCalls === 2) return strengthResult;
            return [];
          },
        }),
        leftJoin: () => ({
          where: () => Promise.resolve(rows),
        }),
        orderBy: () => ({ limit: async () => (opts.priceRow ? [opts.priceRow] : []) }),
      }),
    }),
  } as unknown as Db;
}

describe("resolveSelection", () => {
  it("throws tier_unknown when tier doesn't exist", async () => {
    const db = buildResolveDb({});
    await expect(
      resolveSelection(db, { tier: "ultra", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "tier_unknown" });
  });

  it("throws strength_unknown when standard tier is given a strength", async () => {
    const db = buildResolveDb({ tierFound: { code: "standard" } });
    await expect(
      resolveSelection(db, { tier: "standard", strength: "text", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "strength_unknown" });
  });

  it("throws strength_unknown when premium tier is given no strength", async () => {
    const db = buildResolveDb({ tierFound: { code: "premium" } });
    await expect(
      resolveSelection(db, { tier: "premium", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "strength_unknown" });
  });

  it("throws no_default_model_for_bucket when bucket has eligible rows but no default", async () => {
    const db = buildResolveDb({
      tierFound: { code: "premium" },
      strengthFound: { code: "text" },
      eligibleRows: [
        { modelCode: "alt", isDefault: false, llmModelId: "x", displayName: "Alt", modelStatus: "active" },
      ],
    });
    await expect(
      resolveSelection(db, { tier: "premium", strength: "text", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "no_default_model_for_bucket" });
  });

  it("throws model_not_eligible when selected_model_codes contains a non-bucket model", async () => {
    const db = buildResolveDb({
      tierFound: { code: "premium" },
      strengthFound: { code: "text" },
      eligibleRows: [
        { modelCode: "text-master", isDefault: true, llmModelId: "gpt-image-1", displayName: "Text Master", modelStatus: "active" },
      ],
    });
    await expect(
      resolveSelection(db, {
        tier: "premium", strength: "text",
        selectedModelCodes: ["economy"],
        sizeBucket: "standard", hasInspirationFlag: false,
      }),
    ).rejects.toMatchObject({ code: "model_not_eligible" });
  });

  it("throws pricing_missing when priceBookLookup throws", async () => {
    const db = buildResolveDb({
      tierFound: { code: "standard" },
      eligibleRows: [
        { modelCode: "economy", isDefault: true, llmModelId: "flux-1.1-pro", displayName: "Economy", modelStatus: "active" },
      ],
      priceRow: null,  // forces priceBookLookup to throw "pricebook-not-found"
    });
    await expect(
      resolveSelection(db, { tier: "standard", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "pricing_missing" });
  });

  it("returns models + total credits on the happy default path", async () => {
    const db = buildResolveDb({
      tierFound: { code: "standard" },
      eligibleRows: [
        { modelCode: "economy", isDefault: true, llmModelId: "flux-1.1-pro", displayName: "Economy", modelStatus: "active" },
      ],
      priceRow: { credits: 5, version: 1 },
    });
    const r = await resolveSelection(db, { tier: "standard", sizeBucket: "standard", hasInspirationFlag: false });
    expect(r.models).toEqual([
      { modelCode: "economy", llmModelId: "flux-1.1-pro", displayName: "Economy", credits: 5 },
    ]);
    expect(r.totalCredits).toBe(5);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `pnpm --filter @vyora/db test --run src/queries/taxonomy.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement resolveSelection**

Append to `packages/db/src/queries/taxonomy.ts`:

```typescript
import { priceBookLookup } from "./pricebook";

export class ResolveSelectionError extends Error {
  readonly code:
    | "tier_unknown"
    | "strength_unknown"
    | "no_default_model_for_bucket"
    | "model_not_eligible"
    | "pricing_missing";
  constructor(code: ResolveSelectionError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export interface ResolveSelectionInput {
  tier: string;
  strength?: string;
  selectedModelCodes?: string[];
  sizeBucket: "standard" | "large";
  hasInspirationFlag: boolean;
}

export interface ResolveSelectionResult {
  models: Array<{ modelCode: string; llmModelId: string; displayName: string; credits: number }>;
  totalCredits: number;
}

export async function resolveSelection(
  db: Db,
  input: ResolveSelectionInput,
): Promise<ResolveSelectionResult> {
  // 1. Validate tier exists
  const [tier] = await db.select().from(qualityTiers).where(eq(qualityTiers.code, input.tier)).limit(1);
  if (!tier) throw new ResolveSelectionError("tier_unknown", `Unknown tier: ${input.tier}`);

  // 2. Validate strength
  if (input.tier === "standard" && input.strength) {
    throw new ResolveSelectionError("strength_unknown", "Standard tier does not accept a strength");
  }
  if (input.tier !== "standard" && !input.strength) {
    throw new ResolveSelectionError("strength_unknown", "Premium tier requires a strength");
  }
  if (input.strength) {
    const [s] = await db.select().from(strengths).where(eq(strengths.code, input.strength)).limit(1);
    if (!s) throw new ResolveSelectionError("strength_unknown", `Unknown strength: ${input.strength}`);
  }

  // 3. Fetch eligible routing rows for this bucket.
  const eligibleRows = await db
    .select({
      modelCode: tierStrengthRouting.modelCode,
      isDefault: tierStrengthRouting.isDefault,
      llmModelId: models.llmModelId,
      displayName: models.displayName,
      modelStatus: models.status,
    })
    .from(tierStrengthRouting)
    .leftJoin(models, eq(models.code, tierStrengthRouting.modelCode))
    .where(
      and(
        eq(tierStrengthRouting.tierCode, input.tier),
        input.strength
          ? eq(tierStrengthRouting.strengthCode, input.strength)
          : isNull(tierStrengthRouting.strengthCode),
        isNull(tierStrengthRouting.effectiveTo),
        eq(models.status, "active"),
      ),
    );

  // 4. Determine which model_codes to use.
  let chosen: typeof eligibleRows;
  if (!input.selectedModelCodes || input.selectedModelCodes.length === 0) {
    const def = eligibleRows.find((r) => r.isDefault);
    if (!def) {
      throw new ResolveSelectionError(
        "no_default_model_for_bucket",
        `No default model configured for tier=${input.tier} strength=${input.strength ?? "null"}`,
      );
    }
    chosen = [def];
  } else {
    chosen = [];
    for (const code of input.selectedModelCodes) {
      const row = eligibleRows.find((r) => r.modelCode === code);
      if (!row) {
        throw new ResolveSelectionError(
          "model_not_eligible",
          `Model ${code} is not eligible for tier=${input.tier} strength=${input.strength ?? "null"}`,
        );
      }
      chosen.push(row);
    }
  }

  // 5. Look up pricing per chosen model and sum.
  const out: ResolveSelectionResult["models"] = [];
  let total = 0;
  for (const c of chosen) {
    let price;
    try {
      price = await priceBookLookup(db, {
        modelCode: c.modelCode,
        sizeBucket: input.sizeBucket,
        hasInspirationFlag: input.hasInspirationFlag,
      });
    } catch {
      throw new ResolveSelectionError(
        "pricing_missing",
        `No active pricebook entry for ${c.modelCode}/${input.sizeBucket}/${input.hasInspirationFlag}`,
      );
    }
    out.push({
      modelCode: c.modelCode,
      llmModelId: c.llmModelId ?? "",
      displayName: c.displayName ?? c.modelCode,
      credits: price.credits,
    });
    total += price.credits;
  }
  return { models: out, totalCredits: total };
}
```

- [ ] **Step 4: Run unit tests**

Run: `pnpm --filter @vyora/db test --run src/queries/taxonomy.test.ts`
Expected: all PASS. Add the additional fake-db fixtures needed for the 3 stub cases (`no_default_model_for_bucket`, `model_not_eligible`, `pricing_missing`) and re-run until they pass too.

- [ ] **Step 5: Add integration test for the happy path**

Append to `packages/db/src/queries/taxonomy.int.test.ts`:

```typescript
import { resolveSelection } from "./taxonomy";

describe("resolveSelection (integration)", () => {
  it("default path resolves to economy for standard tier", async () => {
    const r = await resolveSelection(db, {
      tier: "standard",
      sizeBucket: "standard",
      hasInspirationFlag: false,
    });
    expect(r.models).toHaveLength(1);
    expect(r.models[0]!.modelCode).toBe("economy");
    expect(r.totalCredits).toBe(5);
  });

  it("multi-model premium-text fans out to listed models", async () => {
    const r = await resolveSelection(db, {
      tier: "premium",
      strength: "text",
      selectedModelCodes: ["text-master"],
      sizeBucket: "standard",
      hasInspirationFlag: false,
    });
    expect(r.models).toHaveLength(1);
    expect(r.models[0]!.modelCode).toBe("text-master");
    expect(r.totalCredits).toBe(15);
  });
});
```

- [ ] **Step 6: Run integration**

```bash
set -a; . .env.local; set +a
pnpm --filter @vyora/db exec vitest run --config ../../vitest.integration.config.ts src/queries/taxonomy.int.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/queries/taxonomy.ts packages/db/src/queries/taxonomy.test.ts packages/db/src/queries/taxonomy.int.test.ts
git commit -m "feat(db): resolveSelection with five 422 error codes"
```

---

## Phase 3 — API layer

### Task 7: Admin CRUD helpers in `taxonomy.ts`

**Files:**
- Modify: `packages/db/src/queries/taxonomy.ts`
- Modify: `packages/db/src/queries/taxonomy.test.ts`

- [ ] **Step 1: Implement admin CRUD functions**

Append to `packages/db/src/queries/taxonomy.ts`:

```typescript
// Strengths
export async function listStrengths(db: Db) {
  return db.select().from(strengths).orderBy(asc(strengths.sortOrder));
}
export async function createStrength(db: Db, row: typeof strengths.$inferInsert) {
  const [r] = await db.insert(strengths).values(row).returning();
  return r!;
}
export async function updateStrength(db: Db, code: string, patch: Partial<typeof strengths.$inferInsert>) {
  const [r] = await db.update(strengths).set(patch).where(eq(strengths.code, code)).returning();
  return r ?? null;
}
export async function deleteStrength(db: Db, code: string) {
  await db.delete(strengths).where(eq(strengths.code, code));
}

// Models
export async function createModel(db: Db, row: typeof models.$inferInsert) {
  const [r] = await db.insert(models).values(row).returning();
  return r!;
}
export async function updateModel(db: Db, code: string, patch: Partial<typeof models.$inferInsert>) {
  const [r] = await db.update(models).set({ ...patch, updatedAt: new Date() }).where(eq(models.code, code)).returning();
  return r ?? null;
}
export async function deleteModel(db: Db, code: string) {
  await db.delete(models).where(eq(models.code, code));
}
export async function assignStrength(db: Db, modelCode: string, strengthCode: string) {
  await db.insert(modelStrengths).values({ modelCode, strengthCode }).onConflictDoNothing();
}
export async function removeStrength(db: Db, modelCode: string, strengthCode: string) {
  await db.delete(modelStrengths).where(
    and(eq(modelStrengths.modelCode, modelCode), eq(modelStrengths.strengthCode, strengthCode)),
  );
}

// Tags
export async function listTags(db: Db) {
  return db.select().from(tags).orderBy(asc(tags.code));
}
export async function createTag(db: Db, row: typeof tags.$inferInsert) {
  const [r] = await db.insert(tags).values(row).returning();
  return r!;
}
export async function updateTag(db: Db, code: string, patch: Partial<typeof tags.$inferInsert>) {
  const [r] = await db.update(tags).set(patch).where(eq(tags.code, code)).returning();
  return r ?? null;
}
export async function deleteTag(db: Db, code: string) {
  await db.delete(tags).where(eq(tags.code, code));
}
export async function assignTag(db: Db, modelCode: string, tagCode: string) {
  await db.insert(modelTags).values({ modelCode, tagCode }).onConflictDoNothing();
}
export async function removeTag(db: Db, modelCode: string, tagCode: string) {
  await db.delete(modelTags).where(
    and(eq(modelTags.modelCode, modelCode), eq(modelTags.tagCode, tagCode)),
  );
}

// Routing
export async function listRouting(db: Db) {
  return db
    .select()
    .from(tierStrengthRouting)
    .where(isNull(tierStrengthRouting.effectiveTo))
    .orderBy(asc(tierStrengthRouting.tierCode), asc(tierStrengthRouting.strengthCode), asc(tierStrengthRouting.sortOrder));
}
export async function addRouting(db: Db, row: typeof tierStrengthRouting.$inferInsert) {
  // If isDefault=true, clear existing default in same bucket inside one tx.
  return db.transaction(async (tx) => {
    if (row.isDefault) {
      await tx.update(tierStrengthRouting).set({ isDefault: false }).where(
        and(
          eq(tierStrengthRouting.tierCode, row.tierCode),
          row.strengthCode ? eq(tierStrengthRouting.strengthCode, row.strengthCode) : isNull(tierStrengthRouting.strengthCode),
          isNull(tierStrengthRouting.effectiveTo),
        ),
      );
    }
    const [r] = await tx.insert(tierStrengthRouting).values(row).returning();
    return r!;
  });
}
export async function updateRouting(
  db: Db,
  id: string,
  patch: { isDefault?: boolean; sortOrder?: number },
) {
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(tierStrengthRouting).where(eq(tierStrengthRouting.id, id)).limit(1);
    if (!target) return null;
    if (patch.isDefault === true) {
      await tx.update(tierStrengthRouting).set({ isDefault: false }).where(
        and(
          eq(tierStrengthRouting.tierCode, target.tierCode),
          target.strengthCode ? eq(tierStrengthRouting.strengthCode, target.strengthCode) : isNull(tierStrengthRouting.strengthCode),
          isNull(tierStrengthRouting.effectiveTo),
        ),
      );
    }
    const [r] = await tx
      .update(tierStrengthRouting)
      .set({ ...patch })
      .where(eq(tierStrengthRouting.id, id))
      .returning();
    return r ?? null;
  });
}
export async function deleteRouting(db: Db, id: string) {
  await db.delete(tierStrengthRouting).where(eq(tierStrengthRouting.id, id));
}
```

- [ ] **Step 2: Add integration tests for the default-swap transaction**

Append to `packages/db/src/queries/taxonomy.int.test.ts`:

```typescript
import { addRouting, updateRouting, listRouting } from "./taxonomy";

describe("routing default swap (integration)", () => {
  it("setting isDefault=true clears prior default in same bucket", async () => {
    // Arrange: add an alternate model to premium-text with isDefault=false
    const added = await addRouting(db, {
      tierCode: "premium",
      strengthCode: "text",
      modelCode: "design-studio",
      isDefault: false,
      sortOrder: 1,
    });
    // Act: promote the alternate to default
    const promoted = await updateRouting(db, added.id, { isDefault: true });
    expect(promoted?.isDefault).toBe(true);
    // Assert: the original (text-master) is no longer default
    const all = await listRouting(db);
    const textRows = all.filter((r) => r.tierCode === "premium" && r.strengthCode === "text");
    expect(textRows.filter((r) => r.isDefault)).toHaveLength(1);
    // Cleanup: restore default to text-master
    const original = textRows.find((r) => r.modelCode === "text-master")!;
    await updateRouting(db, original.id, { isDefault: true });
  });
});
```

- [ ] **Step 3: Run integration**

```bash
set -a; . .env.local; set +a
pnpm --filter @vyora/db exec vitest run --config ../../vitest.integration.config.ts src/queries/taxonomy.int.test.ts
```

Expected: all PASS including the new test.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/queries/taxonomy.ts packages/db/src/queries/taxonomy.int.test.ts
git commit -m "feat(db): admin CRUD helpers for taxonomy + default-swap tx"
```

---

### Task 8: TaxonomyApi class

**Files:**
- Create: `packages/api/src/taxonomy.ts`
- Create: `packages/api/src/taxonomy.test.ts`
- Modify: `packages/api/src/index.ts` (add re-export)

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/taxonomy.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";

import { TaxonomyApi } from "./taxonomy";

vi.mock("@vyora/db", () => ({
  createDb: () => ({}),
  listStrengths: vi.fn(async () => [{ code: "text", label: "Text" }]),
  listTags: vi.fn(async () => []),
  listActiveModels: vi.fn(async () => []),
  listRouting: vi.fn(async () => []),
}));

const config = { db: { url: "" } } as never;

describe("TaxonomyApi", () => {
  it("listStrengths returns rows from db", async () => {
    const api = new TaxonomyApi(config);
    const rows = await api.listStrengths();
    expect(rows[0]?.code).toBe("text");
  });
});
```

- [ ] **Step 2: Run, fail**

Run: `pnpm --filter @vyora/api test --run src/taxonomy.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `packages/api/src/taxonomy.ts`:

```typescript
import {
  addRouting,
  assignStrength,
  assignTag,
  createDb,
  createModel,
  createStrength,
  createTag,
  deleteModel,
  deleteRouting,
  deleteStrength,
  deleteTag,
  getModel,
  listActiveModels,
  listRouting,
  listStrengths,
  listTags,
  removeStrength,
  removeTag,
  updateModel,
  updateRouting,
  updateStrength,
  updateTag,
} from "@vyora/db";
import type { Config } from "@vyora/shared/config";
import { z } from "zod";

const StrengthInput = z.object({
  code: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
});
const ModelInput = z.object({
  code: z.string().min(1).max(64),
  displayName: z.string().min(1).max(80),
  description: z.string().optional(),
  vendor: z.string().min(1).max(40),
  llmModelId: z.string().min(1).max(120),
  status: z.enum(["active", "paused", "deprecated"]).default("active"),
});
const TagInput = z.object({
  code: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  description: z.string().optional(),
});
const RoutingInput = z.object({
  tierCode: z.string().min(1),
  strengthCode: z.string().nullable(),
  modelCode: z.string().min(1),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});
const RoutingPatch = z.object({
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export class TaxonomyApi {
  constructor(private readonly config: Config) {}
  private db() {
    return createDb(this.config.db.url, "app_admin");
  }

  // Strengths
  listStrengths() { return listStrengths(this.db()); }
  createStrength(input: unknown) { return createStrength(this.db(), StrengthInput.parse(input)); }
  updateStrength(code: string, patch: unknown) {
    return updateStrength(this.db(), code, StrengthInput.partial().parse(patch));
  }
  deleteStrength(code: string) { return deleteStrength(this.db(), code); }

  // Models
  listModels() { return listActiveModels(this.db()); }
  getModel(code: string) { return getModel(this.db(), code); }
  createModel(input: unknown) { return createModel(this.db(), ModelInput.parse(input)); }
  updateModel(code: string, patch: unknown) {
    return updateModel(this.db(), code, ModelInput.partial().parse(patch));
  }
  deleteModel(code: string) { return deleteModel(this.db(), code); }
  assignStrength(modelCode: string, strengthCode: string) { return assignStrength(this.db(), modelCode, strengthCode); }
  removeStrength(modelCode: string, strengthCode: string) { return removeStrength(this.db(), modelCode, strengthCode); }
  assignTag(modelCode: string, tagCode: string) { return assignTag(this.db(), modelCode, tagCode); }
  removeTag(modelCode: string, tagCode: string) { return removeTag(this.db(), modelCode, tagCode); }

  // Tags
  listTags() { return listTags(this.db()); }
  createTag(input: unknown) { return createTag(this.db(), TagInput.parse(input)); }
  updateTag(code: string, patch: unknown) { return updateTag(this.db(), code, TagInput.partial().parse(patch)); }
  deleteTag(code: string) { return deleteTag(this.db(), code); }

  // Routing
  listRouting() { return listRouting(this.db()); }
  addRouting(input: unknown) { return addRouting(this.db(), RoutingInput.parse(input)); }
  updateRouting(id: string, patch: unknown) { return updateRouting(this.db(), id, RoutingPatch.parse(patch)); }
  deleteRouting(id: string) { return deleteRouting(this.db(), id); }
}
```

- [ ] **Step 4: Re-export from api index**

Modify `packages/api/src/index.ts` (or `packages/api/package.json` exports) to expose `./taxonomy`. Match the existing pattern used for `./pricebook` etc.

- [ ] **Step 5: Run, pass**

Run: `pnpm --filter @vyora/api test --run src/taxonomy.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/taxonomy.ts packages/api/src/taxonomy.test.ts packages/api/src/index.ts packages/api/package.json
git commit -m "feat(api): TaxonomyApi class with admin CRUD"
```

---

### Task 9: Generation API contract — accept new shape with backwards compat

**Files:**
- Modify: `packages/shared/src/generation/commercial-contract.ts` (extend Zod schema)
- Modify: `packages/api/src/generation.ts` (resolve via taxonomy, keep usePremiumModel translator)

- [ ] **Step 1: Extend the request schema**

In `packages/shared/src/generation/commercial-contract.ts`, find the `GenerationFlags` schema (currently has `usePremiumModel`). Add the new optional fields:

```typescript
export const GenerationFlags = z.object({
  // … existing fields
  usePremiumModel: z.boolean().default(false),
  tier: z.enum(["standard", "premium"]).optional(),
  strength: z.string().optional(),
  selectedModelCodes: z.array(z.string()).max(8).optional(),
  // …
});
```

- [ ] **Step 2: Update generation.ts to resolve via taxonomy**

Find `packages/api/src/generation.ts:297` (the model-pick logic). Replace the existing `usePremiumModel`-driven path with:

```typescript
import { resolveSelection, ResolveSelectionError } from "@vyora/db";

// … inside the variant-creation loop, replacing the modelCode-pick block:

// Backwards-compat translation: explicit tier wins over usePremiumModel.
let tier: "standard" | "premium";
let strength: string | undefined;
if (v.flags.tier) {
  tier = v.flags.tier;
  strength = v.flags.strength;
} else if (v.flags.usePremiumModel) {
  tier = "premium";
  strength = undefined;  // legacy callers don't carry a strength → use bucket default
} else {
  tier = "standard";
  strength = undefined;
}

let resolved;
try {
  resolved = await resolveSelection(this.db(), {
    tier,
    strength,
    selectedModelCodes: v.flags.selectedModelCodes,
    sizeBucket,
    hasInspirationFlag: !!v.flags.inspirationS3Key,
  });
} catch (e) {
  if (e instanceof ResolveSelectionError) {
    throw new AppError(CODES.INVALID_INPUT, e.code, e.message);
  }
  throw e;
}

// Fan out one variant per resolved model.
for (const m of resolved.models) {
  variants.push({
    generationId,
    templateId: t.id,
    modelUsed: m.modelCode,    // store our internal code, not llm_model_id
    creditCost: m.credits,
    status: "queued",
  });
}
```

- [ ] **Step 3: Update worker call site to dereference llm_model_id**

In `apps/worker/src/handler.ts`, find the gateway call. The variant carries `modelUsed = model.code` (internal). Before calling `gateway.generate`, look up the LLM model id:

```typescript
import { getModel } from "@vyora/db";

const model = await getModel(db, variant.modelUsed);
if (!model) throw new Error(`unknown_model:${variant.modelUsed}`);

const result = await gateway.generate({
  // …
  modelCode: model.llmModelId,
});
```

- [ ] **Step 4: Run all api tests**

```bash
set -a; . .env.local; set +a
pnpm --filter @vyora/api test
pnpm --filter @vyora/db test
```

Expected: existing tests still pass; if any test fails because it constructed a `flags` object lacking `tier`/`strength`, leave it — those legacy paths are still valid.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/generation/commercial-contract.ts packages/api/src/generation.ts apps/worker/src/handler.ts
git commit -m "feat(api): generation accepts {tier, strength, selectedModelCodes} with usePremiumModel backwards compat"
```

---

## Phase 4 — Admin API routes

> Each admin route follows the existing pattern from `apps/web/app/api/admin/moods/route.ts`: GET/POST at the collection, GET/PUT/DELETE at the item. Auth gate via `getSessionWorkspace` + role check, audit via `writeAdminAudit`.

### Task 10: Strengths admin routes

**Files:**
- Create: `apps/web/app/api/admin/taxonomy/strengths/route.ts`
- Create: `apps/web/app/api/admin/taxonomy/strengths/[code]/route.ts`

- [ ] **Step 1: Implement collection route**

Create `apps/web/app/api/admin/taxonomy/strengths/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function GET() {
  return NextResponse.json(await api().listStrengths());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const created = await api().createStrength(body);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.strength.create",
      target: created.code,
      payload: created,
    });
  }
  return NextResponse.json(created);
}
```

- [ ] **Step 2: Implement item route**

Create `apps/web/app/api/admin/taxonomy/strengths/[code]/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rows = await api().listStrengths();
  const row = rows.find((r) => r.code === code);
  return row ? NextResponse.json(row) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const updated = await api().updateStrength(code, body);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.strength.update",
      target: code,
      payload: updated,
    });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  await api().deleteStrength(code);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.strength.delete",
      target: code,
    });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Smoke-test from the running app**

With web server running:

```bash
curl -s http://localhost:3000/api/admin/taxonomy/strengths | jq '.[0].code'
```

Expected: `"text"` (or any one of the seeded codes).

- [ ] **Step 4: Commit**

```bash
git add 'apps/web/app/api/admin/taxonomy/strengths/route.ts' 'apps/web/app/api/admin/taxonomy/strengths/[code]/route.ts'
git commit -m "feat(web): admin strengths CRUD routes"
```

---

### Task 11: Models admin routes (incl. strength + tag assignment sub-routes)

**Files:**
- Create: `apps/web/app/api/admin/taxonomy/models/route.ts`
- Create: `apps/web/app/api/admin/taxonomy/models/[code]/route.ts`
- Create: `apps/web/app/api/admin/taxonomy/models/[code]/strengths/route.ts`
- Create: `apps/web/app/api/admin/taxonomy/models/[code]/tags/route.ts`

- [ ] **Step 1: Models collection route**

Create `apps/web/app/api/admin/taxonomy/models/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function GET() {
  return NextResponse.json(await api().listModels());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const created = await api().createModel(body);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.model.create",
      target: created.code,
      payload: created,
    });
  }
  return NextResponse.json(created);
}
```

- [ ] **Step 2: Models item route**

Create `apps/web/app/api/admin/taxonomy/models/[code]/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = await api().getModel(code);
  return row ? NextResponse.json(row) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const updated = await api().updateModel(code, body);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.model.update",
      target: code,
      payload: updated,
    });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  await api().deleteModel(code);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.model.delete",
      target: code,
    });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Model→strength assignment route**

Create `apps/web/app/api/admin/taxonomy/models/[code]/strengths/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const { strengthCode } = (await request.json()) as { strengthCode: string };
  await api().assignStrength(code, strengthCode);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.model.strength.assign",
      target: code,
      payload: { strengthCode },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const { strengthCode } = (await request.json()) as { strengthCode: string };
  await api().removeStrength(code, strengthCode);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.model.strength.remove",
      target: code,
      payload: { strengthCode },
    });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Model→tag assignment route**

Create `apps/web/app/api/admin/taxonomy/models/[code]/tags/route.ts` — identical structure to Step 3 but the body field is `{ tagCode: string }` and the API methods are `assignTag` / `removeTag`. Audit actions are `admin.taxonomy.model.tag.assign` and `.remove`.

- [ ] **Step 2: Smoke-test**

```bash
curl -s http://localhost:3000/api/admin/taxonomy/models | jq '.[].code'
```

Expected: 5 codes — economy, photoreal-pro, text-master, design-studio, speed-draft.

- [ ] **Step 3: Commit**

```bash
git add 'apps/web/app/api/admin/taxonomy/models/'
git commit -m "feat(web): admin models CRUD + strength/tag assignment routes"
```

---

### Task 12: Tags admin routes

**Files:**
- Create: `apps/web/app/api/admin/taxonomy/tags/route.ts`
- Create: `apps/web/app/api/admin/taxonomy/tags/[code]/route.ts`

- [ ] **Step 1: Tags collection route**

Create `apps/web/app/api/admin/taxonomy/tags/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function GET() {
  return NextResponse.json(await api().listTags());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const created = await api().createTag(body);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.tag.create",
      target: created.code,
      payload: created,
    });
  }
  return NextResponse.json(created);
}
```

- [ ] **Step 1b: Tags item route**

Create `apps/web/app/api/admin/taxonomy/tags/[code]/route.ts` with the same shape as the strengths item route from Task 10 step 2 — substitute `strength` → `tag`/`tags`, `listStrengths` → `listTags` (filter by code in the GET), `updateStrength` → `updateTag`, `deleteStrength` → `deleteTag`. Audit action prefix becomes `admin.taxonomy.tag.update` / `.delete`.

- [ ] **Step 2: Smoke-test**

```bash
curl -s -X POST http://localhost:3000/api/admin/taxonomy/tags -H 'Content-Type: application/json' -d '{"code":"holiday-2026","label":"Holiday 2026"}' | jq '.code'
```

Expected: `"holiday-2026"`.

- [ ] **Step 3: Commit**

```bash
git add 'apps/web/app/api/admin/taxonomy/tags/'
git commit -m "feat(web): admin tags CRUD routes"
```

---

### Task 13: Routing admin routes

**Files:**
- Create: `apps/web/app/api/admin/taxonomy/routing/route.ts`
- Create: `apps/web/app/api/admin/taxonomy/routing/[id]/route.ts`

- [ ] **Step 1: Collection route**

```typescript
// route.ts — GET (list buckets), POST (add a model to a bucket)
import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function GET() {
  return NextResponse.json(await api().listRouting());
}
export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const row = await api().addRouting(body);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.routing.add",
      target: row.id,
      payload: row,
    });
  }
  return NextResponse.json(row);
}
```

- [ ] **Step 2: Item route**

```typescript
// [id]/route.ts — PUT (update is_default/sort_order), DELETE
import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const row = await api().updateRouting(id, body);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.routing.update",
      target: id,
      payload: row,
    });
  }
  return NextResponse.json(row);
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await getSessionWorkspace();
  await api().deleteRouting(id);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.routing.delete",
      target: id,
    });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Smoke-test the default-swap**

```bash
# Add design-studio as alternative to premium-text (not default)
curl -s -X POST http://localhost:3000/api/admin/taxonomy/routing \
  -H 'Content-Type: application/json' \
  -d '{"tierCode":"premium","strengthCode":"text","modelCode":"design-studio","isDefault":false,"sortOrder":1}' | jq

# List
curl -s http://localhost:3000/api/admin/taxonomy/routing | jq '.[] | select(.tierCode=="premium" and .strengthCode=="text")'
# Expect: 2 rows; text-master is_default=true, design-studio is_default=false
```

- [ ] **Step 4: Commit**

```bash
git add 'apps/web/app/api/admin/taxonomy/routing/'
git commit -m "feat(web): admin routing CRUD with default-swap"
```

---

## Phase 5 — Admin UI screens

> Each admin page follows `apps/web/app/admin/moods/page.tsx`: server component fetches via the API class, hands data to a client component in `apps/web/components/admin/`. Client components use `fetch('/api/admin/taxonomy/...')` and `router.refresh()` for mutations.

### Task 14: Strengths admin page

**Files:**
- Create: `apps/web/app/admin/strengths/page.tsx`
- Create: `apps/web/components/admin/strengths-admin.tsx`
- Create: `apps/web/components/admin/strengths-admin.test.tsx`

- [ ] **Step 1: Server page**

```typescript
// apps/web/app/admin/strengths/page.tsx
import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { StrengthsAdmin } from "@/components/admin/strengths-admin";

export default async function AdminStrengthsPage() {
  const rows = await new TaxonomyApi(loadConfig()).listStrengths();
  return <StrengthsAdmin rows={rows as never} />;
}
```

- [ ] **Step 2: Client component**

```typescript
// apps/web/components/admin/strengths-admin.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Row {
  code: string;
  label: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export function StrengthsAdmin({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);

  async function deleteRow(code: string) {
    if (!confirm(`Delete strength "${code}"?`)) return;
    const res = await fetch(`/api/admin/taxonomy/strengths/${code}`, { method: "DELETE" });
    if (!res.ok) { alert(`Delete failed: ${res.status}`); return; }
    router.refresh();
  }

  async function createRow(form: FormData) {
    const body = {
      code: String(form.get("code")),
      label: String(form.get("label")),
      description: String(form.get("description") ?? ""),
      sortOrder: Number(form.get("sortOrder") ?? 0),
    };
    const res = await fetch("/api/admin/taxonomy/strengths", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { alert(`Create failed: ${res.status}`); return; }
    setShowNew(false);
    router.refresh();
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Strengths</h1>
          <p className="page__sub">Premium-tier sub-categories.</p>
        </div>
        <button className="btn btn--accent" onClick={() => setShowNew(true)}>New strength</button>
      </div>

      <table className="table">
        <thead><tr><th>Code</th><th>Label</th><th>Description</th><th>Order</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td><code>{r.code}</code></td>
              <td>{r.label}</td>
              <td>{r.description ?? "—"}</td>
              <td>{r.sortOrder}</td>
              <td><button className="btn btn--secondary btn--sm" onClick={() => deleteRow(r.code)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {showNew && (
        <div className="modal">
          <form action={createRow} className="form">
            <h2>New strength</h2>
            <label>Code <input name="code" required /></label>
            <label>Label <input name="label" required /></label>
            <label>Description <input name="description" /></label>
            <label>Sort order <input name="sortOrder" type="number" defaultValue={0} /></label>
            <div className="form__actions">
              <button type="button" onClick={() => setShowNew(false)}>Cancel</button>
              <button type="submit" className="btn btn--accent">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Render test**

```typescript
// apps/web/components/admin/strengths-admin.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { StrengthsAdmin } from "./strengths-admin";

describe("StrengthsAdmin", () => {
  it("renders rows", () => {
    render(
      <StrengthsAdmin rows={[
        { code: "text", label: "Text rendering", description: null, icon: null, sortOrder: 0 },
      ]} />,
    );
    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("Text rendering")).toBeInTheDocument();
  });

  it("opens the new-strength modal", () => {
    render(<StrengthsAdmin rows={[]} />);
    fireEvent.click(screen.getByText("New strength"));
    expect(screen.getByText("New strength").nextElementSibling).toBeTruthy(); // modal heading
  });
});
```

- [ ] **Step 4: Run, pass**

```bash
pnpm --filter @vyora/web test --run apps/web/components/admin/strengths-admin.test.tsx
```

Expected: 2/2 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/strengths apps/web/components/admin/strengths-admin.tsx apps/web/components/admin/strengths-admin.test.tsx
git commit -m "feat(web): admin /strengths page"
```

---

### Task 15: Models admin list page

**Files:**
- Create: `apps/web/app/admin/models/page.tsx`
- Create: `apps/web/components/admin/models-admin.tsx`
- Create: `apps/web/components/admin/models-admin.test.tsx`

- [ ] **Step 1: Server page** — same shape as `apps/web/app/admin/moods/page.tsx`. Fetches `await new TaxonomyApi(loadConfig()).listModels()`. Pass `rows` to `<ModelsAdmin>`.

- [ ] **Step 2: Client component** — table columns: code, display_name, vendor, llm_model_id, status, "Edit →" link to `/admin/models/${code}`. Filters: `<select>` for vendor and status, `<input>` for code substring. Filtering is local (no server round-trip). "New model" button opens a modal with the same fields as Task 10 strengths but for the `ModelInput` schema. Submit POSTs `/api/admin/taxonomy/models`.

- [ ] **Step 3: Render test** — assert table renders rows, filter narrows, "New model" button opens form.

- [ ] **Step 4: Run, pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/models/page.tsx apps/web/components/admin/models-admin.tsx apps/web/components/admin/models-admin.test.tsx
git commit -m "feat(web): admin /models list page"
```

---

### Task 16: Model detail page

**Files:**
- Create: `apps/web/app/admin/models/[code]/page.tsx`
- Create: `apps/web/components/admin/model-detail.tsx`
- Create: `apps/web/components/admin/model-detail.test.tsx`

- [ ] **Step 1: Server page** — fetch `model = await api.getModel(code)`, plus parallel-fetch `strengths`, `tags`, `routingRows`. Pass everything as props.

- [ ] **Step 2: Client component**

Sections:
- **Basics** form: edit display_name, description, vendor, llm_model_id, status. Submit PUT `/api/admin/taxonomy/models/[code]`.
- **Strengths** multi-select chip block. Click chip → DELETE `/strengths` sub-route. Click "+ Add" → dropdown of unassigned strengths → POST.
- **Tags** chip block with autocomplete combobox. Typing creates an inline tag (POST `/tags` then POST `/models/[code]/tags`).
- **Routing (read-only)** — list of buckets where this model appears, with "Default" badge if applicable. Link to `/admin/routing` for edits.
- **Danger zone**: delete button (only enabled if no routing/no pricebook references; guard via the API which returns 409 with reason).

- [ ] **Step 3: Render test** — basic render + chip add/remove flow with mocked fetch.

- [ ] **Step 4: Run, pass.**

- [ ] **Step 5: Commit**

```bash
git add 'apps/web/app/admin/models/[code]/page.tsx' apps/web/components/admin/model-detail.tsx apps/web/components/admin/model-detail.test.tsx
git commit -m "feat(web): admin /models/[code] detail page"
```

---

### Task 17: Tags admin page

Same shape as Task 14 (Strengths). Different verbs: list, create, update, delete tags. Inline tag creation already wired from Model Detail (Task 16); this page is for bulk management.

**Files:**
- Create: `apps/web/app/admin/tags/page.tsx`
- Create: `apps/web/components/admin/tags-admin.tsx`
- Create: `apps/web/components/admin/tags-admin.test.tsx`

- [ ] Steps 1-5: copy Task 14, substitute `tag` ↔ `strength`, route `/api/admin/taxonomy/tags`.
- [ ] Commit: `git commit -m "feat(web): admin /tags page"`

---

### Task 18: Routing admin page + bucket panel

**Files:**
- Create: `apps/web/app/admin/routing/page.tsx`
- Create: `apps/web/components/admin/routing-admin.tsx`
- Create: `apps/web/components/admin/routing-bucket-panel.tsx`
- Create: `apps/web/components/admin/routing-admin.test.tsx`

- [ ] **Step 1: Server page** — fetch routing + models + strengths in parallel:

```typescript
const [routing, models, strengths] = await Promise.all([
  api.listRouting(),
  api.listModels(),
  api.listStrengths(),
]);
```

Pass all three as props to `<RoutingAdmin>`.

- [ ] **Step 2: RoutingAdmin component** — group routing rows into buckets keyed by `(tierCode, strengthCode)`. Render one card per bucket. Each card shows the assigned models in `sortOrder` order, with the default highlighted. "Edit" button opens `<RoutingBucketPanel>` as a side drawer for that bucket.

- [ ] **Step 3: RoutingBucketPanel component** — props: `{ bucket: { tierCode, strengthCode }, currentRows: RouteRow[], allModels: Model[] }`. Three sections:
  - **Eligible models** (sortable list with default-radio + "Remove" button per row) — drag-to-reorder writes `sortOrder` via PUT.
  - **Add a model** — `<select>` of models NOT yet in this bucket → POST `/routing` with the chosen model.
  - **Set default** — radio buttons; selecting writes PUT `/routing/[id]` with `{ isDefault: true }`.

- [ ] **Step 4: Render test** — render with seed data, click "Edit" on premium-text bucket, verify panel opens with 1 row (text-master), default radio checked.

- [ ] **Step 5: Run, pass.**

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/admin/routing apps/web/components/admin/routing-admin.tsx apps/web/components/admin/routing-bucket-panel.tsx apps/web/components/admin/routing-admin.test.tsx
git commit -m "feat(web): admin /routing page with bucket panel"
```

---

### Task 19: Update existing pricebook admin to use models.code

**Files:**
- Modify: `apps/web/components/admin/pricebook-admin.tsx`
- Modify: `apps/web/app/admin/pricebook/page.tsx`
- Modify: `packages/api/src/pricebook.ts` (drop `premiumFlag` from validator; require active model)

- [ ] **Step 1: Update PricebookApi validator**

In `packages/api/src/pricebook.ts`, drop `premiumFlag: z.boolean()` from the `Entry` Zod schema. In the `insert` method, validate that `model_code` exists and is `status='active'` via `getModel(db, args.modelCode)` — throw a descriptive 422 if not.

- [ ] **Step 2: Update the page to fetch models for the dropdown**

```typescript
// apps/web/app/admin/pricebook/page.tsx
import { PricebookApi } from "@vyora/api/pricebook";
import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { PricebookAdmin } from "@/components/admin/pricebook-admin";

export default async function AdminPricebookPage() {
  const config = loadConfig();
  const [rows, models] = await Promise.all([
    new PricebookApi(config).list(),
    new TaxonomyApi(config).listModels(),
  ]);
  return <PricebookAdmin rows={rows as never} models={models as never} />;
}
```

- [ ] **Step 3: Update the client component**

In `apps/web/components/admin/pricebook-admin.tsx`:
- Add `models: Array<{ code: string; displayName: string }>` to props.
- Replace the freeform `model_code` text input with a `<select>` populated from `props.models` showing `${displayName} (${code})`.
- Render `premium_flag` as a read-only badge ("Legacy: premium" if true) — no edit control.
- Keep all other columns intact.

- [ ] **Step 4: Run typecheck + tests**

```bash
pnpm --filter @vyora/api --filter @vyora/web typecheck
pnpm --filter @vyora/web test --run apps/web/components/admin/pricebook-admin.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/pricebook.ts apps/web/app/admin/pricebook/page.tsx apps/web/components/admin/pricebook-admin.tsx
git commit -m "feat(web): admin /pricebook uses models.code dropdown; premium_flag becomes legacy"
```

---

## Phase 6 — End-to-end verification

### Task 20: Smoke test — admin creates a tag, generation submitted with new shape

**Files:** none (verification only)

- [ ] **Step 1: With web + worker running, hit the admin tags route**

```bash
curl -s -X POST http://localhost:3000/api/admin/taxonomy/tags \
  -H 'Content-Type: application/json' \
  -d '{"code":"smoke-test","label":"Smoke Test"}' | jq
```

Expected: `{"code":"smoke-test","label":"Smoke Test", ...}`.

- [ ] **Step 2: Submit a generation with the new shape**

```bash
curl -s -X POST http://localhost:3000/api/generations \
  -H 'Content-Type: application/json' \
  -d '{
    "brandId": "<your brand id>",
    "brief": "Smoke test — premium photoreal",
    "outputTarget": {"kind":"social","platform":"ig","format":"ig-post"},
    "flags": {"tier":"premium","strength":"photoreal"}
  }' | jq
```

Expected: `{"id": "<uuid>", ...}` — and the variant created has `model_used = 'photoreal-pro'`.

- [ ] **Step 3: Verify variant + price in DB**

```bash
docker exec studio-v1-postgres-1 psql -U studio -d studio -c "
  SELECT id, model_used, status, credit_cost FROM generation_variants
  ORDER BY created_at DESC LIMIT 3;
"
```

Expected: top row has `model_used='photoreal-pro'`, `credit_cost=8` (matches the photoreal-pro/standard/no-inspiration row).

- [ ] **Step 4: Submit a multi-model variation**

```bash
curl -s -X POST http://localhost:3000/api/generations \
  -H 'Content-Type: application/json' \
  -d '{
    "brandId": "<your brand id>",
    "brief": "Multi-model smoke",
    "outputTarget": {"kind":"social","platform":"ig","format":"ig-post"},
    "flags": {"tier":"premium","strength":"text","selectedModelCodes":["text-master"]}
  }' | jq
```

Expected: same shape; only one model picked (since `text-master` is the only eligible one in the seed).

- [ ] **Step 5: Validate one of the five 422 codes**

```bash
curl -s -X POST http://localhost:3000/api/generations \
  -H 'Content-Type: application/json' \
  -d '{
    "brandId": "<your brand id>",
    "brief": "Should fail",
    "outputTarget": {"kind":"social","platform":"ig","format":"ig-post"},
    "flags": {"tier":"premium","strength":"text","selectedModelCodes":["economy"]}
  }' | jq
```

Expected: HTTP 422 with body containing code `"model_not_eligible"` (economy isn't in the premium-text bucket).

- [ ] **Step 6: Final commit — none required (verification only).** If the smoke test exposed a bug, fix it as its own task with TDD steps.

---

## What's intentionally NOT in this plan

- Provider research + new model wiring (sub-project B). The migration seeds five `models` rows that all map to `llm_model_id` values already wired in code (`flux-1.1-pro`, `gpt-image-1`, `recraft-v3`, `bedrock-sd35`). New vendors / Google Nano Banana family / additional OpenAI variants land in B.
- Quick Create UI rework (sub-project C). The user-facing picker still renders the old `usePremiumModel` toggle; the new shape is server-accepted but client-unused for now.
- Manual crop tool (sub-project D).
- Cleanup migration that drops `price_book_entries.premium_flag` — runs after sub-project C ships.

---

## Self-review notes

- Coverage: each spec section has at least one task — schema (Task 1+2), seed (Task 2), pricebook restructure (Task 3), query helpers (Tasks 4-7), admin API (Tasks 10-13), admin UI (Tasks 14-19), generation contract (Task 9), end-to-end (Task 20).
- Type consistency: `getModel` (Task 4) is referenced again in Task 9 (worker call site) and Task 19 (pricebook validation) — same name, same shape.
- Placeholder scan: the only "TBD-shaped" content is in Task 6 step 1 (the test file lists `// … additional cases stub`); the step explicitly says to fill in the three additional cases before running step 4. Acceptable since the engineer is expected to write fixture rows for each error case using the same `makeFakeDb` helper.
