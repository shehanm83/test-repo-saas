import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Admin-managed catalogue of marketing surfaces (FB Landscape, IG Post,
// Pinterest Pin, …). Sub-project C's Quick Create wizard fetches the active
// rows and uses them as Step 1 tiles. Each row pins down the *target*
// dimensions; Step 3 then narrows to the model's compatible native sizes.
export const useCases = pgTable("use_cases", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  platform: text("platform"),
  targetWidth: integer("target_width").notNull(),
  targetHeight: integer("target_height").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status", { enum: ["active", "paused", "deprecated"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
