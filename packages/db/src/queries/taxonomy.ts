import { asc, eq } from "drizzle-orm";

import type { Db } from "../client";
import { models } from "../schema";

export type ModelRow = typeof models.$inferSelect;

export async function getModel(db: Db, code: string): Promise<ModelRow | null> {
  const [row] = await db.select().from(models).where(eq(models.code, code)).limit(1);
  return row ?? null;
}

export async function listActiveModels(db: Db): Promise<ModelRow[]> {
  return db
    .select()
    .from(models)
    .where(eq(models.status, "active"))
    .orderBy(asc(models.code));
}
