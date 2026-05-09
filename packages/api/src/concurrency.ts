import { and, eq, inArray, sql, type Db, generations } from "@vyora/db";
import { AppError } from "@vyora/shared/errors/app-error";
import { CODES } from "@vyora/shared/errors/codes";

const CAPS: Record<string, number> = { free: 1, starter: 2, pro: 4, business: 8, agency: 16 };
const ACTIVE_GENERATION_WINDOW_MINUTES = 30;

export async function assertGenerationCapacity(db: Db, workspaceId: string, planCode: string): Promise<void> {
  const cap = CAPS[planCode] ?? 1;
  const running = await db.select({ id: generations.id }).from(generations)
    .where(and(
      eq(generations.workspaceId, workspaceId),
      inArray(generations.status, ["pending", "running"]),
      sql`${generations.createdAt} > now() - (${ACTIVE_GENERATION_WINDOW_MINUTES} || ' minutes')::interval`,
    ));
  if (running.length >= cap) {
    throw new AppError(CODES.GENERATION_CONCURRENT_CAP, `Plan limit: ${cap} concurrent generations.`, 429, { cap });
  }
}
