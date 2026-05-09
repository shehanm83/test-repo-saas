import bcrypt from "bcryptjs";

import { eq, sql, staffUsers } from "@vyora/db";
import type { Db } from "@vyora/db";

export interface StaffIdentity {
  id: string;
  username: string;
}

/**
 * Verify HTTP Basic credentials against the staff_users table.
 *
 * Returns the staff identity on match, null on miss. Bumps last_login_at on
 * success so we can audit "when did the admin last log in".
 *
 * **Constant-time-ish behaviour:** if the username doesn't exist we still
 * call bcrypt.compare against a dummy hash so the response time doesn't leak
 * whether the username is valid.
 */
const DUMMY_HASH = "$2b$12$invalidinvalidinvalidiOS5jGRA4LRfUsj4jfNd80tLUu1tn8hG";

export async function verifyStaffCredentials(
  db: Db,
  username: string,
  password: string,
): Promise<StaffIdentity | null> {
  const [row] = await db
    .select({ id: staffUsers.id, username: staffUsers.username, passwordHash: staffUsers.passwordHash })
    .from(staffUsers)
    .where(eq(staffUsers.username, username))
    .limit(1);

  const hash = row?.passwordHash ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  if (!row || !ok) return null;

  // Best-effort touch — failure here doesn't block login.
  await db
    .update(staffUsers)
    .set({ lastLoginAt: sql`now()` })
    .where(eq(staffUsers.id, row.id))
    .catch(() => undefined);

  return { id: row.id, username: row.username };
}

/**
 * Parse and verify an HTTP `Authorization: Basic <base64>` header. Returns
 * the staff identity or null if the header is missing/malformed/wrong.
 */
export async function verifyStaffBasicAuth(
  db: Db,
  authHeader: string | null | undefined,
): Promise<StaffIdentity | null> {
  if (!authHeader || !authHeader.startsWith("Basic ")) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(authHeader.slice("Basic ".length).trim(), "base64").toString("utf8");
  } catch {
    return null;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  const username = decoded.slice(0, idx);
  const password = decoded.slice(idx + 1);
  if (!username || !password) return null;
  return verifyStaffCredentials(db, username, password);
}

/**
 * Hash a password for inserting into staff_users. Uses cost 12 — same as the
 * seeded admin row so all entries roughly match in verification cost.
 */
export async function hashStaffPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
