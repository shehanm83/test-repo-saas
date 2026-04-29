# Slice 08 — Catalog schema (moods, templates, stock, price book)

**Phase:** 1 — Database schema
**Depends on:** 06
**Spec references:** [Spec § 1.2 (moods, mood_template_bindings, templates, stock_assets, price_book_entries)](../specs/2026-04-25-studio-v1-spec.md), [Spec § 4 (Mood system)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- Migration `0003_catalog.sql` creates the four global catalog tables + binding table
- These are global (no `workspace_id`) — RLS enabled but with a permissive read for `app_user` and full read/write for `app_admin`
- Indexes for embedding similarity on `stock_assets`
- Drizzle types exported

---

## Files

**Create:**
- `packages/db/src/schema/catalog.ts`
- `packages/db/src/migrations/0003_catalog.sql` (generated, edited)

**Modify:**
- `packages/db/src/schema/index.ts`

---

## Tasks

- [ ] **Step 1 — Create `packages/db/src/schema/catalog.ts`**

```ts
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";

export const moods = pgTable("moods", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["seasonal", "evergreen"] }).notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  promptModifiers: text("prompt_modifiers").notNull().default(""),
  negativePrompts: text("negative_prompts").notNull().default(""),
  accentPalette: jsonb("accent_palette").$type<string[]>().notNull().default([] as never),
  decorationTags: text("decoration_tags").array(),
  typographyHint: jsonb("typography_hint"),
  supportedAspectRatios: text("supported_aspect_ratios").array().notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  previewS3Key: text("preview_s3_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  jsxSource: text("jsx_source").notNull(),
  slots: jsonb("slots").notNull(),
  textSafeZones: jsonb("text_safe_zones").notNull(),
  preferredModel: text("preferred_model").notNull(),
  supportedAspectRatios: text("supported_aspect_ratios").array().notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  previewS3Key: text("preview_s3_key"),
  requiresBrowserRender: boolean("requires_browser_render").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const moodTemplateBindings = pgTable("mood_template_bindings", {
  id: uuid("id").primaryKey().defaultRandom(),
  moodId: uuid("mood_id").notNull().references(() => moods.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  weight: integer("weight").notNull().default(100),
});

export const stockAssets = pgTable("stock_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind", { enum: ["icon", "photo"] }).notNull(),
  s3Key: text("s3_key").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  tags: text("tags").array().notNull().default([] as never),
  embedding: vector("embedding", { dimensions: 1536 }),
  license: text("license"),
  attribution: text("attribution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const priceBookEntries = pgTable("price_book_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelCode: text("model_code").notNull(),
  sizeBucket: text("size_bucket", { enum: ["standard", "large"] }).notNull(),
  premiumFlag: boolean("premium_flag").notNull().default(false),
  hasInspirationFlag: boolean("has_inspiration_flag").notNull().default(false),
  credits: integer("credits").notNull(),
  version: integer("version").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2 — Update `packages/db/src/schema/index.ts`**

```ts
export * from "./identity.js";
export * from "./brand.js";
export * from "./catalog.js";
```

- [ ] **Step 3 — Generate + edit migration**

```bash
pnpm --filter @vyora/db exec drizzle-kit generate --name=catalog
```

Edit the generated `0003_catalog.sql`. Append:

```sql
-- Indexes
CREATE INDEX mood_bindings_mood_idx ON mood_template_bindings (mood_id);
CREATE INDEX mood_bindings_template_idx ON mood_template_bindings (template_id);
CREATE INDEX stock_embedding_idx ON stock_assets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX moods_status_idx ON moods (status, kind, valid_from, valid_to);
CREATE INDEX templates_status_idx ON templates (status, preferred_model);
CREATE INDEX price_book_active_idx ON price_book_entries (model_code, size_bucket, premium_flag, has_inspiration_flag, version);

-- RLS — global tables; app_user reads only "published" rows (or any for moods/templates pickers); app_admin full
ALTER TABLE moods ENABLE ROW LEVEL SECURITY; ALTER TABLE moods FORCE ROW LEVEL SECURITY;
CREATE POLICY moods_user_read ON moods FOR SELECT TO app_user USING (status = 'published');
CREATE POLICY moods_admin_all ON moods FOR ALL TO app_admin USING (true);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY; ALTER TABLE templates FORCE ROW LEVEL SECURITY;
CREATE POLICY templates_user_read ON templates FOR SELECT TO app_user USING (status = 'published');
CREATE POLICY templates_admin_all ON templates FOR ALL TO app_admin USING (true);

ALTER TABLE mood_template_bindings ENABLE ROW LEVEL SECURITY; ALTER TABLE mood_template_bindings FORCE ROW LEVEL SECURITY;
CREATE POLICY bindings_user_read ON mood_template_bindings FOR SELECT TO app_user USING (true);
CREATE POLICY bindings_admin_all ON mood_template_bindings FOR ALL TO app_admin USING (true);

ALTER TABLE stock_assets ENABLE ROW LEVEL SECURITY; ALTER TABLE stock_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY stock_user_read ON stock_assets FOR SELECT TO app_user USING (true);
CREATE POLICY stock_admin_all ON stock_assets FOR ALL TO app_admin USING (true);

ALTER TABLE price_book_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE price_book_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY pricebook_user_read ON price_book_entries FOR SELECT TO app_user USING (true);
CREATE POLICY pricebook_admin_all ON price_book_entries FOR ALL TO app_admin USING (true);

GRANT SELECT ON moods, templates, mood_template_bindings, stock_assets, price_book_entries TO app_user;
GRANT ALL ON moods, templates, mood_template_bindings, stock_assets, price_book_entries TO app_admin;
```

- [ ] **Step 4 — Run migration**

```bash
pnpm --filter @vyora/db db:migrate
```

- [ ] **Step 5 — Commit**

```bash
git add -A
git commit -m "feat(db): catalog schema (moods, templates, stock, price book) with RLS"
```

---

## Verification

```bash
psql "$DATABASE_URL" -c "\dt"
psql "$DATABASE_URL" -c "SET ROLE app_user; SELECT count(*) FROM moods;"   # 0, no error
```

## Commit message

```
feat(db): catalog schema (moods, templates, stock, price book) with RLS
```
