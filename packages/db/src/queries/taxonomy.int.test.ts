import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { createDb } from "../client";
import { getTierOptions, getModel } from "./taxonomy";

const url = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5433/studio";

describe("taxonomy integration", () => {
  const db = createDb(url, "app_admin");

  it("getTierOptions returns the seeded shape", async () => {
    const opts = await getTierOptions(db);
    expect(opts.standard?.modelCode).toBe("economy");
    expect(opts.standard?.displayName).toBe("Economy");
    expect(opts.premium.text?.defaultModelCode).toBe("text-master");
    expect(opts.premium.photoreal?.defaultModelCode).toBe("photoreal-pro");
    expect(opts.premium.design?.defaultModelCode).toBe("design-studio");
    expect(opts.premium.speed?.defaultModelCode).toBe("speed-draft");
  });

  it("getModel returns each seeded model", async () => {
    for (const code of ["economy", "photoreal-pro", "text-master", "design-studio", "speed-draft"]) {
      const m = await getModel(db, code);
      expect(m?.code).toBe(code);
      expect(m?.status).toBe("active");
    }
    expect(await getModel(db, "nope")).toBeNull();
  });

  it("partial unique blocks two is_default in same bucket", async () => {
    await expect(
      db.execute(sql`
        INSERT INTO tier_strength_routing (tier_code, strength_code, model_code, is_default)
        VALUES ('premium', 'text', 'photoreal-pro', true)
      `),
    ).rejects.toThrow();
  });
});
