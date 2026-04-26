import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { generations } from "./generation";
import { workspaces } from "./identity";

export const creditLedgerEntries = pgTable(
  "credit_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["grant", "reservation", "commit", "release", "topup", "refund", "adjustment"],
    }).notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    generationId: uuid("generation_id").references(() => generations.id, { onDelete: "set null" }),
    captionJobId: uuid("caption_job_id"),
    stripeEventId: text("stripe_event_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idemUnique: uniqueIndex("ledger_idem_unique").on(table.idempotencyKey),
    stripeUnique: uniqueIndex("ledger_stripe_event_unique").on(table.stripeEventId),
  }),
);

export const subscriptions = pgTable("subscriptions", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  planCode: text("plan_code", {
    enum: ["free", "starter", "pro", "business", "agency"],
  }).notNull(),
  status: text("status").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
