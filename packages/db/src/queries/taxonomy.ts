import { and, asc, eq, isNull } from "drizzle-orm";

import type { Db } from "../client";
import {
  modelStrengths,
  modelTags,
  models,
  qualityTiers,
  strengths,
  tags,
  tierStrengthRouting,
} from "../schema";
import { priceBookLookup } from "./pricebook";

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

export class ResolveSelectionError extends Error {
  readonly code:
    | "tier_unknown"
    | "strength_unknown"
    | "no_default_model_for_bucket"
    | "model_not_eligible"
    | "pricing_missing";
  constructor(code: ResolveSelectionError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export interface ResolveSelectionInput {
  tier: string;
  strength?: string;
  selectedModelCodes?: string[];
  sizeBucket: "standard" | "large";
  hasInspirationFlag: boolean;
}

export interface ResolveSelectionResult {
  models: Array<{ modelCode: string; llmModelId: string; displayName: string; credits: number }>;
  totalCredits: number;
}

export async function resolveSelection(
  db: Db,
  input: ResolveSelectionInput,
): Promise<ResolveSelectionResult> {
  const [tier] = await db.select().from(qualityTiers).where(eq(qualityTiers.code, input.tier)).limit(1);
  if (!tier) throw new ResolveSelectionError("tier_unknown", `Unknown tier: ${input.tier}`);

  if (input.tier === "standard" && input.strength) {
    throw new ResolveSelectionError("strength_unknown", "Standard tier does not accept a strength");
  }
  if (input.tier !== "standard" && !input.strength) {
    throw new ResolveSelectionError("strength_unknown", "Premium tier requires a strength");
  }
  if (input.strength) {
    const [s] = await db.select().from(strengths).where(eq(strengths.code, input.strength)).limit(1);
    if (!s) throw new ResolveSelectionError("strength_unknown", `Unknown strength: ${input.strength}`);
  }

  const eligibleRows = await db
    .select({
      modelCode: tierStrengthRouting.modelCode,
      isDefault: tierStrengthRouting.isDefault,
      llmModelId: models.llmModelId,
      displayName: models.displayName,
      modelStatus: models.status,
    })
    .from(tierStrengthRouting)
    .leftJoin(models, eq(models.code, tierStrengthRouting.modelCode))
    .where(
      and(
        eq(tierStrengthRouting.tierCode, input.tier),
        input.strength
          ? eq(tierStrengthRouting.strengthCode, input.strength)
          : isNull(tierStrengthRouting.strengthCode),
        isNull(tierStrengthRouting.effectiveTo),
        eq(models.status, "active"),
      ),
    );

  let chosen: typeof eligibleRows;
  if (!input.selectedModelCodes || input.selectedModelCodes.length === 0) {
    const def = eligibleRows.find((r) => r.isDefault);
    if (!def) {
      throw new ResolveSelectionError(
        "no_default_model_for_bucket",
        `No default model configured for tier=${input.tier} strength=${input.strength ?? "null"}`,
      );
    }
    chosen = [def];
  } else {
    chosen = [];
    for (const code of input.selectedModelCodes) {
      const row = eligibleRows.find((r) => r.modelCode === code);
      if (!row) {
        throw new ResolveSelectionError(
          "model_not_eligible",
          `Model ${code} is not eligible for tier=${input.tier} strength=${input.strength ?? "null"}`,
        );
      }
      chosen.push(row);
    }
  }

  const out: ResolveSelectionResult["models"] = [];
  let total = 0;
  for (const c of chosen) {
    let price;
    try {
      price = await priceBookLookup(db, {
        modelCode: c.modelCode,
        sizeBucket: input.sizeBucket,
        hasInspirationFlag: input.hasInspirationFlag,
      });
    } catch {
      throw new ResolveSelectionError(
        "pricing_missing",
        `No active pricebook entry for ${c.modelCode}/${input.sizeBucket}/${input.hasInspirationFlag}`,
      );
    }
    out.push({
      modelCode: c.modelCode,
      llmModelId: c.llmModelId ?? "",
      displayName: c.displayName ?? c.modelCode,
      credits: price.credits,
    });
    total += price.credits;
  }
  return { models: out, totalCredits: total };
}

// Strengths
export async function listStrengths(db: Db) {
  return db.select().from(strengths).orderBy(asc(strengths.sortOrder));
}
export async function createStrength(db: Db, row: typeof strengths.$inferInsert) {
  const [r] = await db.insert(strengths).values(row).returning();
  return r!;
}
export async function updateStrength(db: Db, code: string, patch: Partial<typeof strengths.$inferInsert>) {
  const [r] = await db.update(strengths).set(patch).where(eq(strengths.code, code)).returning();
  return r ?? null;
}
export async function deleteStrength(db: Db, code: string) {
  await db.delete(strengths).where(eq(strengths.code, code));
}

// Models
export async function createModel(db: Db, row: typeof models.$inferInsert) {
  const [r] = await db.insert(models).values(row).returning();
  return r!;
}
export async function updateModel(db: Db, code: string, patch: Partial<typeof models.$inferInsert>) {
  const [r] = await db.update(models).set({ ...patch, updatedAt: new Date() }).where(eq(models.code, code)).returning();
  return r ?? null;
}
export async function deleteModel(db: Db, code: string) {
  await db.delete(models).where(eq(models.code, code));
}
export async function assignStrength(db: Db, modelCode: string, strengthCode: string) {
  await db.insert(modelStrengths).values({ modelCode, strengthCode }).onConflictDoNothing();
}
export async function removeStrength(db: Db, modelCode: string, strengthCode: string) {
  await db.delete(modelStrengths).where(
    and(eq(modelStrengths.modelCode, modelCode), eq(modelStrengths.strengthCode, strengthCode)),
  );
}

// Tags
export async function listTags(db: Db) {
  return db.select().from(tags).orderBy(asc(tags.code));
}
export async function createTag(db: Db, row: typeof tags.$inferInsert) {
  const [r] = await db.insert(tags).values(row).returning();
  return r!;
}
export async function updateTag(db: Db, code: string, patch: Partial<typeof tags.$inferInsert>) {
  const [r] = await db.update(tags).set(patch).where(eq(tags.code, code)).returning();
  return r ?? null;
}
export async function deleteTag(db: Db, code: string) {
  await db.delete(tags).where(eq(tags.code, code));
}
export async function assignTag(db: Db, modelCode: string, tagCode: string) {
  await db.insert(modelTags).values({ modelCode, tagCode }).onConflictDoNothing();
}
export async function removeTag(db: Db, modelCode: string, tagCode: string) {
  await db.delete(modelTags).where(
    and(eq(modelTags.modelCode, modelCode), eq(modelTags.tagCode, tagCode)),
  );
}

// Routing
export async function listRouting(db: Db) {
  return db
    .select()
    .from(tierStrengthRouting)
    .where(isNull(tierStrengthRouting.effectiveTo))
    .orderBy(asc(tierStrengthRouting.tierCode), asc(tierStrengthRouting.strengthCode), asc(tierStrengthRouting.sortOrder));
}
export async function addRouting(db: Db, row: typeof tierStrengthRouting.$inferInsert) {
  // If isDefault=true, clear existing default in same bucket inside one tx.
  return db.transaction(async (tx) => {
    if (row.isDefault) {
      await tx.update(tierStrengthRouting).set({ isDefault: false }).where(
        and(
          eq(tierStrengthRouting.tierCode, row.tierCode),
          row.strengthCode ? eq(tierStrengthRouting.strengthCode, row.strengthCode) : isNull(tierStrengthRouting.strengthCode),
          isNull(tierStrengthRouting.effectiveTo),
        ),
      );
    }
    const [r] = await tx.insert(tierStrengthRouting).values(row).returning();
    return r!;
  });
}
export async function updateRouting(
  db: Db,
  id: string,
  patch: { isDefault?: boolean; sortOrder?: number },
) {
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(tierStrengthRouting).where(eq(tierStrengthRouting.id, id)).limit(1);
    if (!target) return null;
    if (patch.isDefault === true) {
      await tx.update(tierStrengthRouting).set({ isDefault: false }).where(
        and(
          eq(tierStrengthRouting.tierCode, target.tierCode),
          target.strengthCode ? eq(tierStrengthRouting.strengthCode, target.strengthCode) : isNull(tierStrengthRouting.strengthCode),
          isNull(tierStrengthRouting.effectiveTo),
        ),
      );
    }
    const [r] = await tx
      .update(tierStrengthRouting)
      .set({ ...patch })
      .where(eq(tierStrengthRouting.id, id))
      .returning();
    return r ?? null;
  });
}
export async function deleteRouting(db: Db, id: string) {
  await db.delete(tierStrengthRouting).where(eq(tierStrengthRouting.id, id));
}
