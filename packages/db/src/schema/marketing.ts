import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const landingHeroCards = pgTable("landing_hero_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  s3Key: text("s3_key").notNull(),
  headline: text("headline").notNull(),
  sub: text("sub").notNull().default(""),
  textPosition: text("text_position", { enum: ["top", "bottom"] })
    .notNull()
    .default("bottom"),
  textColor: text("text_color", { enum: ["white", "dark"] })
    .notNull()
    .default("white"),
  brandInitials: text("brand_initials").notNull().default("NW"),
  brandColor: text("brand_color").notNull().default("#FFFFFF"),
  brandTextColor: text("brand_text_color").notNull().default("#2A1F18"),
  badgeText: text("badge_text"),
  badgeBg: text("badge_bg"),
  badgeColor: text("badge_color"),
  rotation: integer("rotation").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
