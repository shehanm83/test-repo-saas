import {
  adminInsertPricebookEntry,
  adminListPricebook,
  adminListPricebookForModel,
  createDb,
  expirePricebookVersion,
  getModel,
  priceBookLookup,
} from "@vyora/db";
import type { Config } from "@vyora/shared/config";
import { z } from "zod";

const Entry = z.object({
  modelCode: z.string(),
  sizeBucket: z.enum(["standard", "large"]),
  hasInspirationFlag: z.boolean(),
  credits: z.number().int().min(1).max(1000),
  version: z.number().int().min(1),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
});

export class PricebookApi {
  constructor(private readonly config: Config) {}

  private db() {
    return createDb(this.config.db.url, "app_admin");
  }

  async list() {
    return adminListPricebook(this.db());
  }

  async insert(input: unknown) {
    const value = Entry.parse(input);
    const db = this.db();
    const model = await getModel(db, value.modelCode);
    if (!model || model.status !== "active") {
      const err = new Error(
        `Model "${value.modelCode}" is not an active model.`,
      ) as Error & { status?: number };
      err.status = 422;
      throw err;
    }
    return adminInsertPricebookEntry(db, {
      ...value,
      effectiveFrom: new Date(value.effectiveFrom),
      effectiveTo: value.effectiveTo ? new Date(value.effectiveTo) : null,
    });
  }

  async expire(id: string, at: string) {
    await expirePricebookVersion(this.db(), id, new Date(at));
  }

  async lookup(args: Parameters<typeof priceBookLookup>[1]) {
    return priceBookLookup(this.db(), args);
  }

  async forModel(modelCode: string) {
    return adminListPricebookForModel(this.db(), modelCode);
  }

  /**
   * Set the credits for one (modelCode, sizeBucket, hasInspirationFlag) cell.
   * Audit-trail-friendly: expires the current active row and inserts a new
   * one at version+1, matching the pattern the rest of the price book uses.
   */
  async setCredits(input: unknown) {
    const value = z
      .object({
        modelCode: z.string(),
        sizeBucket: z.enum(["standard", "large"]),
        hasInspirationFlag: z.boolean(),
        credits: z.number().int().min(1).max(1000),
      })
      .parse(input);
    const db = this.db();
    const model = await getModel(db, value.modelCode);
    if (!model) {
      const err = new Error(`Model "${value.modelCode}" does not exist.`) as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    const now = new Date();
    const existing = await adminListPricebookForModel(db, value.modelCode);
    const current = existing.find(
      (e) =>
        e.sizeBucket === value.sizeBucket && e.hasInspirationFlag === value.hasInspirationFlag,
    );
    if (current && current.credits === value.credits) {
      // No-op — caller hit save without changing anything.
      return current;
    }
    if (current) {
      await expirePricebookVersion(db, current.id, now);
    }
    const nextVersion = (current?.version ?? 0) + 1;
    return adminInsertPricebookEntry(db, {
      modelCode: value.modelCode,
      sizeBucket: value.sizeBucket,
      hasInspirationFlag: value.hasInspirationFlag,
      credits: value.credits,
      version: nextVersion,
      effectiveFrom: now,
    });
  }
}
