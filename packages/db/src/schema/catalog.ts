import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const moods = pgTable("moods", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["seasonal", "evergreen"] }).notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  promptModifiers: text("prompt_modifiers").notNull().default(""),
  negativePrompts: text("negative_prompts").notNull().default(""),
  accentPalette: jsonb("accent_palette")
    .$type<string[]>()
    .notNull()
    .default([] as never),
  decorationTags: text("decoration_tags").array(),
  typographyHint: jsonb("typography_hint"),
  supportedAspectRatios: text("supported_aspect_ratios").array().notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
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
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
  previewS3Key: text("preview_s3_key"),
  requiresBrowserRender: boolean("requires_browser_render").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const moodTemplateBindings = pgTable("mood_template_bindings", {
  id: uuid("id").primaryKey().defaultRandom(),
  moodId: uuid("mood_id")
    .notNull()
    .references(() => moods.id, { onDelete: "cascade" }),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  weight: integer("weight").notNull().default(100),
});

export const stockAssets = pgTable("stock_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind", { enum: ["icon", "photo"] }).notNull(),
  s3Key: text("s3_key").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  tags: text("tags")
    .array()
    .notNull()
    .default([] as never),
  embedding: vector("embedding", { dimensions: 1536 }),
  license: text("license"),
  attribution: text("attribution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const priceBookEntries = pgTable("price_book_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelCode: text("model_code").notNull(),
  sizeBucket: text("size_bucket", { enum: ["standard", "large"] }).notNull(),
  hasInspirationFlag: boolean("has_inspiration_flag").notNull().default(false),
  credits: integer("credits").notNull(),
  version: integer("version").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
