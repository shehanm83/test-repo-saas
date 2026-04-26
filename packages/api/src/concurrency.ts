import { and, eq, inArray, type Db, generations } from "@studio/db";
import { AppError, CODES } from "@studio/shared";

const CAPS: Record<string, number> = { free: 1, starter: 2, pro: 4, business: 8, agency: 16 };

export async function assertGenerationCapacity(db: Db, workspaceId: string, planCode: string): Promise<void> {
  const cap = CAPS[planCode] ?? 1;
  const running = await db.select({ id: generations.id }).from(generations)
    .where(and(eq(generations.workspaceId, workspaceId), inArray(generations.status, ["pending", "running"])));
  if (running.length >= cap) {
    throw new AppError(CODES.GENERATION_CONCURRENT_CAP, `Plan limit: ${cap} concurrent generations.`, 429, { cap });
  }
}
