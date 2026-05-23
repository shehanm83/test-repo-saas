import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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

export interface LandingHeroConfigJson {
  headline: {
    line1: string;
    line2Prefix: string;
    line2Middle: string;
    line2Suffix: string;
  };
  lede: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
    enabled: boolean;
  };
  proofItems: string[];
  prompt: {
    brief: string;
    brandName: string;
    brandInitials: string;
    swatches: string[];
    moodName: string;
  };
  trust: {
    label: string;
    teams: Array<{
      name: string;
      color: string;
    }>;
  };
}

export interface HomeShowcaseConfigJson {
  kicker: string;
  galleryHeading: string;
  differentiatorHeading: string;
  cards: Array<{
    eyebrow: string;
    heading: string;
    body: string;
    color: string;
  }>;
}

export const landingHeroSets = pgTable("landing_hero_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
  weight: integer("weight").notNull().default(1),
  config: jsonb("config").$type<LandingHeroConfigJson>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landingHeroSetCards = pgTable(
  "landing_hero_set_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => landingHeroSets.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(),
    s3Key: text("s3_key"),
    imageUrl: text("image_url"),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("landing_hero_set_cards_set_slot_uidx").on(table.setId, table.slot)],
);

export const homeShowcaseConfig = pgTable("home_showcase_config", {
  id: text("id").primaryKey().default("singleton"),
  config: jsonb("config").$type<HomeShowcaseConfigJson>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const homeShowcaseImages = pgTable("home_showcase_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  s3Key: text("s3_key").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
