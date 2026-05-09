import { and, asc, eq } from "drizzle-orm";

import type { Db } from "../client";
import { useCases } from "../schema";

export type UseCaseRow = typeof useCases.$inferSelect;

export async function listUseCases(db: Db, opts?: { activeOnly?: boolean }): Promise<UseCaseRow[]> {
  if (opts?.activeOnly) {
    return db
      .select()
      .from(useCases)
      .where(eq(useCases.status, "active"))
      .orderBy(asc(useCases.sortOrder), asc(useCases.code));
  }
  return db.select().from(useCases).orderBy(asc(useCases.sortOrder), asc(useCases.code));
}

export async function getUseCase(db: Db, code: string): Promise<UseCaseRow | null> {
  const [row] = await db.select().from(useCases).where(eq(useCases.code, code)).limit(1);
  return row ?? null;
}

export async function createUseCase(db: Db, row: typeof useCases.$inferInsert) {
  const [r] = await db.insert(useCases).values(row).returning();
  return r!;
}

export async function updateUseCase(
  db: Db,
  code: string,
  patch: Partial<typeof useCases.$inferInsert>,
) {
  const [r] = await db
    .update(useCases)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(useCases.code, code))
    .returning();
  return r ?? null;
}

export async function deleteUseCase(db: Db, code: string) {
  await db.delete(useCases).where(eq(useCases.code, code));
}

// Aspect-ratio helpers — used by the wizard's resolution picker to filter
// model_supported_sizes whose ratio matches the use_case's aspect_ratio.
export function aspectRatioToFloat(s: string): number {
  const [a, b] = s.split(":").map((part) => Number(part.trim()));
  if (!a || !b) return 1;
  return a / b;
}

export function aspectsMatch(a: string, b: string, tolerance = 0.05): boolean {
  const ra = aspectRatioToFloat(a);
  const rb = aspectRatioToFloat(b);
  if (ra === 0 || rb === 0) return false;
  return Math.abs(ra - rb) / Math.max(ra, rb) <= tolerance;
}
