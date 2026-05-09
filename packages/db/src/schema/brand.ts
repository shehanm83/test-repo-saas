import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, vector } from "drizzle-orm/pg-core";

import { workspaces } from "./identity";

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    logoS3Key: text("logo_s3_key"),
    palette: jsonb("palette").$type<{
      primary: string;
      secondary?: string;
      accent?: string;
      extras?: string[];
    }>(),
    fonts: jsonb("fonts").$type<{
      heading: { family: string; weight?: string };
      body: { family: string; weight?: string };
    }>(),
    voiceNotes: text("voice_notes"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceNameUnique: uniqueIndex("brands_workspace_name_unique").on(
      table.workspaceId,
      table.name,
    ),
  }),
);

export const brandAssets = pgTable("brand_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
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
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id")
    .references(() => brands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
