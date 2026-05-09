import { and, asc, eq, isNull } from "drizzle-orm";

import type { Db } from "../client";
import { models, tierStrengthRouting } from "../schema";

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

export interface TierBucket {
  defaultModelCode: string;
  eligibleModelCodes: string[];
  modelsByCode: Record<string, { displayName: string; description: string | null }>;
}

export interface TierOptions {
  standard: { modelCode: string; displayName: string } | null;
  premium: Record<string, TierBucket>;
}

export async function getTierOptions(db: Db): Promise<TierOptions> {
  const rows = await db
    .select({
      tierCode: tierStrengthRouting.tierCode,
      strengthCode: tierStrengthRouting.strengthCode,
      modelCode: tierStrengthRouting.modelCode,
      isDefault: tierStrengthRouting.isDefault,
      sortOrder: tierStrengthRouting.sortOrder,
      modelDisplayName: models.displayName,
      modelDescription: models.description,
      modelStatus: models.status,
    })
    .from(tierStrengthRouting)
    .leftJoin(models, eq(models.code, tierStrengthRouting.modelCode))
    .where(
      and(
        isNull(tierStrengthRouting.effectiveTo),
        eq(models.status, "active"),
      ),
    )
    .orderBy(
      asc(tierStrengthRouting.tierCode),
      asc(tierStrengthRouting.strengthCode),
      asc(tierStrengthRouting.sortOrder),
    );

  let standard: TierOptions["standard"] = null;
  const premium: Record<string, TierBucket> = {};

  for (const r of rows) {
    if (r.tierCode === "standard") {
      if (r.isDefault && r.modelDisplayName) {
        standard = { modelCode: r.modelCode, displayName: r.modelDisplayName };
      }
      continue;
    }
    const strength = r.strengthCode;
    if (!strength) continue;
    let bucket = premium[strength];
    if (!bucket) {
      bucket = {
        defaultModelCode: r.isDefault ? r.modelCode : "",
        eligibleModelCodes: [],
        modelsByCode: {},
      };
      premium[strength] = bucket;
    }
    bucket.eligibleModelCodes.push(r.modelCode);
    if (r.isDefault) bucket.defaultModelCode = r.modelCode;
    bucket.modelsByCode[r.modelCode] = {
      displayName: r.modelDisplayName ?? r.modelCode,
      description: r.modelDescription ?? null,
    };
  }

  return { standard, premium };
}
