import { describe, expect, it } from "vitest";

import { getModel, listActiveModels } from "./taxonomy";
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
