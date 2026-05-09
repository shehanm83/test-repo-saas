import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Staff users — separate from `users` (the customer-facing Clerk-mirrored
// table) so super-admin auth doesn't depend on Clerk and customer-token
// compromise can't escalate to admin.
//
// No public sign-up; rows are created by `pnpm staff:add` or seeded in
// migration. Sign-in uses HTTP Basic against `password_hash` (bcrypt).
export const staffUsers = pgTable("staff_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Reserved for the TOTP follow-up — see notes in writeup. Null today.
  totpSecret: text("totp_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});
