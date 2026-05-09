import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { brands } from "./brand";
import { workspaces } from "./identity";

export const productLines = pgTable("product_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  targetAudience: text("target_audience"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  status: text("status", { enum: ["draft", "active", "archived"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  productLineId: uuid("product_line_id").references(() => productLines.id, {
    onDelete: "set null",
  }),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brandLabel: text("brand_label"),
  model: text("model"),
  sku: text("sku"),
  category: text("category"),
  title: text("title"),
  subtitle: text("subtitle"),
  description: text("description"),
  priceMinor: integer("price_minor"),
  compareAtPriceMinor: integer("compare_at_price_minor"),
  currency: text("currency").notNull().default("USD"),
  discountText: text("discount_text"),
  keyFeatures: jsonb("key_features").$type<string[]>().notNull().default([] as never),
  benefits: jsonb("benefits").$type<string[]>().notNull().default([] as never),
  targetAudience: text("target_audience"),
  variantAttributes: jsonb("variant_attributes")
    .$type<Record<string, string | number | boolean>>()
    .notNull()
    .default({} as never),
  status: text("status", { enum: ["draft", "active", "archived"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  color: text("color"),
  size: text("size"),
  material: text("material"),
  flavor: text("flavor"),
  packageQuantity: text("package_quantity"),
  priceMinor: integer("price_minor"),
  compareAtPriceMinor: integer("compare_at_price_minor"),
  currency: text("currency"),
  assetOverrides: jsonb("asset_overrides")
    .$type<Record<string, string>>()
    .notNull()
    .default({} as never),
  status: text("status", { enum: ["draft", "active", "archived"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productAssets = pgTable("product_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  productVariantId: uuid("product_variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  kind: text("kind", {
    enum: ["product", "packaging", "lifestyle", "label_detail", "before", "after", "cutout"],
  }).notNull(),
  s3Key: text("s3_key").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  hasTransparency: boolean("has_transparency").notNull().default(false),
  backgroundRemoved: boolean("background_removed").notNull().default(false),
  qualityScore: integer("quality_score"),
  labelVisibility: text("label_visibility", { enum: ["unknown", "low", "medium", "high"] })
    .notNull()
    .default("unknown"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
