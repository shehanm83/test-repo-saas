import { describe, expect, it } from "vitest";

import { getModel, listActiveModels, getTierOptions } from "./taxonomy";
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
