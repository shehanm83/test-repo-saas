#!/usr/bin/env -S node --import tsx/esm
/**
 * Add or rotate a staff (super-admin) user.
 *
 * Usage:
 *   pnpm staff:add <username>          # prompts for password (read from TTY)
 *   pnpm staff:add <username> <pw>     # CI-friendly form (avoid for prod)
 *
 * Idempotent: running twice with the same username re-hashes and overwrites
 * the password (i.e., this doubles as a rotate command).
 */
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { hashStaffPassword } from "@vyora/auth";
import { createDb, eq, staffUsers } from "@vyora/db";

async function main() {
  const username = process.argv[2];
  if (!username || !/^[a-z][a-z0-9_-]{1,40}$/.test(username)) {
    console.error("Usage: pnpm staff:add <username>");
    console.error("Username must start with a letter and contain only [a-z0-9_-].");
    process.exit(2);
  }

  let password = process.argv[3];
  if (!password) {
    const rl = createInterface({ input, output });
    password = await rl.question(`Password for ${username}: `);
    rl.close();
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(2);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const db = createDb(dbUrl, "app_admin");
  const passwordHash = await hashStaffPassword(password);

  const [existing] = await db
    .select({ id: staffUsers.id })
    .from(staffUsers)
    .where(eq(staffUsers.username, username))
    .limit(1);

  if (existing) {
    await db
      .update(staffUsers)
      .set({ passwordHash })
      .where(eq(staffUsers.id, existing.id));
    console.log(`rotated password for staff user "${username}" (${existing.id})`);
  } else {
    const [row] = await db
      .insert(staffUsers)
      .values({ username, passwordHash })
      .returning({ id: staffUsers.id });
    console.log(`created staff user "${username}" (${row?.id})`);
  }

  process.exit(0);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
