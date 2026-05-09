import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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

export const models = pgTable("models", {
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
});

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
    // in migration 0016 because Drizzle can't express partial unique with a
    // WHERE on a NULL-able column cleanly.
  }),
);
