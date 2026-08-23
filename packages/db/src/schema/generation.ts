import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { brands, projects } from "./brand";
import { moods, templates } from "./catalog";
import { users, workspaces } from "./identity";

export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "cascade" }),
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
  variantSpec: jsonb("variant_spec"),
  promptMetadata: jsonb("prompt_metadata"),
  referenceSnapshots: jsonb("reference_snapshots"),
  seed: integer("seed"),
  parentVariantId: uuid("parent_variant_id"),
  refinementSpec: jsonb("refinement_spec"),
  qaStatus: text("qa_status", {
    enum: ["pending", "passed", "soft_failed", "hard_failed", "unavailable"],
  }),
  qaResult: jsonb("qa_result"),
  qaRank: integer("qa_rank"),
  autoRetryCount: integer("auto_retry_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const quickCreateDrafts = pgTable(
  "quick_create_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceUserUnique: uniqueIndex("quick_create_drafts_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
  }),
);

export const generationVariantFeedback = pgTable(
  "generation_variant_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => generationVariants.id, { onDelete: "cascade" }),
    rating: text("rating", { enum: ["up", "down"] }).notNull(),
    reason: text("reason", {
      enum: [
        "wrong_product",
        "not_my_idea",
        "bad_composition",
        "brand_mismatch",
        "text_problem",
        "other",
      ],
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceUserVariantUnique: uniqueIndex(
      "generation_variant_feedback_workspace_user_variant_unique",
    ).on(table.workspaceId, table.userId, table.variantId),
  }),
);

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
