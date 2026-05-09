import { sql, type Db } from "@vyora/db";
import { AppError } from "@vyora/shared/errors/app-error";
import { CODES } from "@vyora/shared/errors/codes";

export async function rateLimit(db: Db, key: string, limit: number, windowSec: number): Promise<void> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000).toISOString();
  const r = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit_counters (key, window_start, count)
    VALUES (${key}, ${windowStart}::timestamptz, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limit_counters.count + 1
    RETURNING count
  `);
  const c = r[0]?.count ?? 0;
  if (c > limit) {
    throw new AppError(CODES.RATE_LIMIT_EXCEEDED, "Too many requests, please slow down.", 429, { retryAfterSec: windowSec });
  }
}
