import { createDb as createDbBase } from "@vyora/db";
import { verifyStaffBasicAuth as verifyBase } from "@vyora/auth";

// Thin wrappers used by middleware.ts so the import surface there is small
// and explicit. The middleware runs in the Node runtime; bcryptjs + the pg
// driver are both fine to load.
export function createDb() {
  return createDbBase(process.env.DATABASE_URL ?? "", "app_admin");
}

export async function verifyStaffBasicAuth(
  db: ReturnType<typeof createDb>,
  authHeader: string | null | undefined,
) {
  return verifyBase(db, authHeader);
}
