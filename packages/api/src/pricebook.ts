import {
  adminInsertPricebookEntry,
  adminListPricebook,
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
}
