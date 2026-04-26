import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { brands, projects } from "./brand";
import { moods, templates } from "./catalog";
import { workspaces } from "./identity";

export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  moodId: uuid("mood_id").references(() => moods.id, { onDelete: "set null" }),
  brief: text("brief").notNull(),
  settings: jsonb("settings").notNull(),
  inspirationImageS3Key: text("inspiration_image_s3_key"),
  inspirationInfluence: text("inspiration_influence", {
    enum: ["subtle", "balanced", "strong"],
  }),
  priceBookVersion: integer("price_book_version").notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] })
    .notNull()
    .default("pending"),
  requestedByUserId: uuid("requested_by_user_id").notNull(),
  errorPayload: jsonb("error_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const generationVariants = pgTable("generation_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  generationId: uuid("generation_id")
    .notNull()
    .references(() => generations.id, { onDelete: "cascade" }),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id),
  modelUsed: text("model_used"),
  outputS3Key: text("output_s3_key"),
  backgroundS3Key: text("background_s3_key"),
  creditCost: integer("credit_cost").notNull().default(0),
  renderMs: integer("render_ms"),
  status: text("status", {
    enum: ["queued", "running", "completed", "failed", "failed_safety"],
  })
    .notNull()
    .default("queued"),
  errorPayload: jsonb("error_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const captionJobs = pgTable("caption_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  generationId: uuid("generation_id").references(() => generations.id, { onDelete: "set null" }),
  brief: text("brief").notNull(),
  voice: text("voice"),
  lengthTier: text("length_tier", { enum: ["short", "medium", "long"] }).notNull(),
  outputText: text("output_text"),
  creditCost: integer("credit_cost").notNull().default(0),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] })
    .notNull()
    .default("pending"),
  errorPayload: jsonb("error_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
