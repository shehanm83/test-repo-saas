import { describe, expect, it, vi } from "vitest";

import { TaxonomyApi } from "./taxonomy";

vi.mock("@vyora/db", () => ({
  createDb: () => ({}),
  listStrengths: vi.fn(async () => [{ code: "text", label: "Text" }]),
  listTags: vi.fn(async () => []),
  listActiveModels: vi.fn(async () => []),
  listRouting: vi.fn(async () => []),
  getModel: vi.fn(async () => null),
  createStrength: vi.fn(),
  updateStrength: vi.fn(),
  deleteStrength: vi.fn(),
  createModel: vi.fn(),
  updateModel: vi.fn(),
  deleteModel: vi.fn(),
  assignStrength: vi.fn(),
  removeStrength: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  assignTag: vi.fn(),
  removeTag: vi.fn(),
  addRouting: vi.fn(),
  updateRouting: vi.fn(),
  deleteRouting: vi.fn(),
}));

const config = { db: { url: "" } } as never;

describe("TaxonomyApi", () => {
  it("listStrengths returns rows from db", async () => {
    const api = new TaxonomyApi(config);
    const rows = await api.listStrengths();
    expect(rows[0]?.code).toBe("text");
  });
});
