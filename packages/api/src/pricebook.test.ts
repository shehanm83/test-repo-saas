import type { Config } from "@vyora/shared/config";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(() => ({})),
  adminListPricebook: vi.fn(async () => []),
  adminInsertPricebookEntry: vi.fn(async (_db: unknown, value: Record<string, unknown>) => ({
    id: "p1",
    ...value,
  })),
  priceBookLookup: vi.fn(async () => ({ credits: 5 })),
  expirePricebookVersion: vi.fn(async () => undefined),
  getModel: vi.fn(async (_db: unknown, code: string) =>
    code === "flux-1.1-pro"
      ? { code, displayName: "Flux 1.1 Pro", status: "active" }
      : null,
  ),
}));

vi.mock("@vyora/db", () => ({
  createDb: mocks.createDb,
  adminListPricebook: mocks.adminListPricebook,
  adminInsertPricebookEntry: mocks.adminInsertPricebookEntry,
  priceBookLookup: mocks.priceBookLookup,
  expirePricebookVersion: mocks.expirePricebookVersion,
  getModel: mocks.getModel,
}));

import { PricebookApi } from "./pricebook";

const api = new PricebookApi({ db: { url: "" } } as Config);

describe("PricebookApi", () => {
  it("rejects out-of-range credits", async () => {
    await expect(
      api.insert({
        modelCode: "flux-1.1-pro",
        sizeBucket: "standard",
        hasInspirationFlag: false,
        credits: 0,
        version: 1,
        effectiveFrom: "2026-04-25T00:00:00Z",
      }),
    ).rejects.toThrow();
  });

  it("rejects unknown model with 422-style error", async () => {
    await expect(
      api.insert({
        modelCode: "unknown-model",
        sizeBucket: "standard",
        hasInspirationFlag: false,
        credits: 5,
        version: 1,
        effectiveFrom: "2026-04-25T00:00:00Z",
      }),
    ).rejects.toThrow(/not an active model/i);
  });

  it("inserts an entry for an active model", async () => {
    const result = await api.insert({
      modelCode: "flux-1.1-pro",
      sizeBucket: "standard",
      hasInspirationFlag: false,
      credits: 5,
      version: 1,
      effectiveFrom: "2026-04-25T00:00:00Z",
    });
    expect(result).toMatchObject({ id: "p1", modelCode: "flux-1.1-pro" });
  });
});
