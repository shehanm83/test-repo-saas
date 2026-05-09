import { describe, expect, it } from "vitest";

import { getModel, listActiveModels, getTierOptions, resolveSelection } from "./taxonomy";
import type { Db } from "../client";

function makeFakeDb(rows: unknown): Db {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (Array.isArray(rows) ? rows : [rows]),
        }),
        orderBy: () => ({ where: () => Promise.resolve(rows) }),
      }),
    }),
  } as unknown as Db;
}

describe("getModel", () => {
  it("returns the model row when found", async () => {
    const db = makeFakeDb({ code: "economy", displayName: "Economy", status: "active" });
    const model = await getModel(db, "economy");
    expect(model?.code).toBe("economy");
  });

  it("returns null when not found", async () => {
    const db = makeFakeDb([]);
    const model = await getModel(db, "missing");
    expect(model).toBeNull();
  });
});

describe("listActiveModels", () => {
  it("returns rows from the query", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({ orderBy: async () => [{ code: "economy" }] }),
        }),
      }),
    } as unknown as Db;
    const rows = await listActiveModels(db);
    expect(rows).toEqual([{ code: "economy" }]);
  });
});

describe("getTierOptions", () => {
  it("groups standard separately from premium-by-strength", async () => {
    const fakeRows = [
      { tierCode: "standard", strengthCode: null, modelCode: "economy",
        isDefault: true, sortOrder: 0, modelDisplayName: "Economy", modelDescription: null, modelStatus: "active" },
      { tierCode: "premium", strengthCode: "text", modelCode: "text-master",
        isDefault: true, sortOrder: 0, modelDisplayName: "Text Master", modelDescription: null, modelStatus: "active" },
      { tierCode: "premium", strengthCode: "text", modelCode: "design-studio",
        isDefault: false, sortOrder: 1, modelDisplayName: "Design Studio", modelDescription: null, modelStatus: "active" },
    ];
    const db = {
      select: () => ({ from: () => ({ leftJoin: () => ({ where: () => ({ orderBy: async () => fakeRows }) }) }) }),
    } as unknown as Db;

    const opts = await getTierOptions(db);
    expect(opts.standard?.modelCode).toBe("economy");
    expect(opts.premium?.text?.defaultModelCode).toBe("text-master");
    expect(opts.premium?.text?.eligibleModelCodes).toEqual(["text-master", "design-studio"]);
  });
});

function buildResolveDb(opts: {
  tierFound?: { code: string };
  strengthFound?: { code: string } | null;
  eligibleRows?: Array<{ modelCode: string; isDefault: boolean; llmModelId: string; displayName: string; modelStatus: string }>;
  priceRow?: { credits: number; version: number } | null;
}): Db {
  const tierResult = opts.tierFound ? [opts.tierFound] : [];
  const strengthResult = opts.strengthFound ? [opts.strengthFound] : [];
  const rows = opts.eligibleRows ?? [];
  const priceResult = opts.priceRow ? [opts.priceRow] : [];
  let selectCalls = 0;
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCalls++;
            if (selectCalls === 1) return tierResult;
            if (selectCalls === 2) return strengthResult;
            return [];
          },
          orderBy: () => ({ limit: async () => priceResult }),
        }),
        leftJoin: () => ({
          where: () => Promise.resolve(rows),
        }),
        orderBy: () => ({ limit: async () => priceResult }),
      }),
    }),
  } as unknown as Db;
}

describe("resolveSelection", () => {
  it("throws tier_unknown when tier doesn't exist", async () => {
    const db = buildResolveDb({});
    await expect(
      resolveSelection(db, { tier: "ultra", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "tier_unknown" });
  });

  it("throws strength_unknown when standard tier is given a strength", async () => {
    const db = buildResolveDb({ tierFound: { code: "standard" } });
    await expect(
      resolveSelection(db, { tier: "standard", strength: "text", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "strength_unknown" });
  });

  it("throws strength_unknown when premium tier is given no strength", async () => {
    const db = buildResolveDb({ tierFound: { code: "premium" } });
    await expect(
      resolveSelection(db, { tier: "premium", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "strength_unknown" });
  });

  it("throws no_default_model_for_bucket when bucket has eligible rows but no default", async () => {
    const db = buildResolveDb({
      tierFound: { code: "premium" },
      strengthFound: { code: "text" },
      eligibleRows: [
        { modelCode: "alt", isDefault: false, llmModelId: "x", displayName: "Alt", modelStatus: "active" },
      ],
    });
    await expect(
      resolveSelection(db, { tier: "premium", strength: "text", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "no_default_model_for_bucket" });
  });

  it("throws model_not_eligible when selected_model_codes contains a non-bucket model", async () => {
    const db = buildResolveDb({
      tierFound: { code: "premium" },
      strengthFound: { code: "text" },
      eligibleRows: [
        { modelCode: "text-master", isDefault: true, llmModelId: "gpt-image-1", displayName: "Text Master", modelStatus: "active" },
      ],
    });
    await expect(
      resolveSelection(db, {
        tier: "premium", strength: "text",
        selectedModelCodes: ["economy"],
        sizeBucket: "standard", hasInspirationFlag: false,
      }),
    ).rejects.toMatchObject({ code: "model_not_eligible" });
  });

  it("throws pricing_missing when priceBookLookup throws", async () => {
    const db = buildResolveDb({
      tierFound: { code: "standard" },
      eligibleRows: [
        { modelCode: "economy", isDefault: true, llmModelId: "flux-1.1-pro", displayName: "Economy", modelStatus: "active" },
      ],
      priceRow: null,
    });
    await expect(
      resolveSelection(db, { tier: "standard", sizeBucket: "standard", hasInspirationFlag: false }),
    ).rejects.toMatchObject({ code: "pricing_missing" });
  });

  it("returns models + total credits on the happy default path", async () => {
    const db = buildResolveDb({
      tierFound: { code: "standard" },
      eligibleRows: [
        { modelCode: "economy", isDefault: true, llmModelId: "flux-1.1-pro", displayName: "Economy", modelStatus: "active" },
      ],
      priceRow: { credits: 5, version: 1 },
    });
    const r = await resolveSelection(db, { tier: "standard", sizeBucket: "standard", hasInspirationFlag: false });
    expect(r.models).toEqual([
      { modelCode: "economy", llmModelId: "flux-1.1-pro", displayName: "Economy", credits: 5 },
    ]);
    expect(r.totalCredits).toBe(5);
  });
});
