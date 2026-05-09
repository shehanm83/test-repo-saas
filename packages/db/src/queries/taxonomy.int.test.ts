import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { createDb } from "../client";
import { getTierOptions, getModel, resolveSelection } from "./taxonomy";
import { addRouting, updateRouting, listRouting, deleteRouting, listSupportedSizes } from "./taxonomy";

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

describe("resolveSelection (integration)", () => {
  const db = createDb(url, "app_admin");

  it("default path resolves to economy for standard tier", async () => {
    const r = await resolveSelection(db, {
      tier: "standard",
      sizeBucket: "standard",
      hasInspirationFlag: false,
    });
    expect(r.models).toHaveLength(1);
    expect(r.models[0]!.modelCode).toBe("economy");
    expect(r.totalCredits).toBe(5);
  });

  it("multi-model premium-text fans out to listed models", async () => {
    const r = await resolveSelection(db, {
      tier: "premium",
      strength: "text",
      selectedModelCodes: ["text-master"],
      sizeBucket: "standard",
      hasInspirationFlag: false,
    });
    expect(r.models).toHaveLength(1);
    expect(r.models[0]!.modelCode).toBe("text-master");
    expect(r.totalCredits).toBe(15);
  });
});

describe("listSupportedSizes (integration)", () => {
  const db = createDb(url, "app_admin");

  it("returns ≥3 seeded sizes for each of the 5 models from migration 0016", async () => {
    for (const code of ["economy", "photoreal-pro", "text-master", "design-studio", "speed-draft"]) {
      const sizes = await listSupportedSizes(db, code);
      expect(sizes.length, `model ${code}`).toBeGreaterThanOrEqual(3);
      // Square should be present and first by sortOrder.
      expect(sizes[0]).toMatchObject({ width: 1024, height: 1024 });
    }
  });

  it("orders by sort_order then width", async () => {
    const sizes = await listSupportedSizes(db, "text-master");
    const orders = sizes.map((s) => s.sortOrder);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });

  it("returns empty for an unknown model_code", async () => {
    const sizes = await listSupportedSizes(db, "does-not-exist");
    expect(sizes).toEqual([]);
  });

  it("FK cascades on model delete", async () => {
    // Insert a throwaway model, attach a size, delete the model — sizes should vanish.
    await db.execute(sql`
      INSERT INTO models (code, display_name, vendor, llm_model_id, status)
      VALUES ('cascade-probe', 'Cascade Probe', 'replicate', 'flux-1.1-pro', 'paused')
    `);
    await db.execute(sql`
      INSERT INTO model_supported_sizes (model_code, width, height, label, sort_order)
      VALUES ('cascade-probe', 1024, 1024, 'Square', 0)
    `);
    expect(await listSupportedSizes(db, "cascade-probe")).toHaveLength(1);
    await db.execute(sql`DELETE FROM models WHERE code = 'cascade-probe'`);
    expect(await listSupportedSizes(db, "cascade-probe")).toHaveLength(0);
  });
});

describe("routing default swap (integration)", () => {
  const db = createDb(url, "app_admin");

  it("setting isDefault=true clears prior default in same bucket", async () => {
    // Arrange: add an alternate model to premium-text with isDefault=false
    const added = await addRouting(db, {
      tierCode: "premium",
      strengthCode: "text",
      modelCode: "design-studio",
      isDefault: false,
      sortOrder: 1,
    });
    // Act: promote the alternate to default
    const promoted = await updateRouting(db, added.id, { isDefault: true });
    expect(promoted?.isDefault).toBe(true);
    // Assert: only one default in the bucket
    const all = await listRouting(db);
    const textRows = all.filter((r) => r.tierCode === "premium" && r.strengthCode === "text");
    expect(textRows.filter((r) => r.isDefault)).toHaveLength(1);
    // Cleanup: restore default to text-master and remove the alternate row so
    // the test is idempotent on reruns (version unique on tier+strength+model).
    const original = textRows.find((r) => r.modelCode === "text-master")!;
    await updateRouting(db, original.id, { isDefault: true });
    await deleteRouting(db, added.id);
  });
});
