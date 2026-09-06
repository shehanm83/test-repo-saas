import type { Config } from "@layertone/shared/config";
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
}));

vi.mock("@layertone/db", () => ({
  createDb: mocks.createDb,
  adminListPricebook: mocks.adminListPricebook,
  adminInsertPricebookEntry: mocks.adminInsertPricebookEntry,
  priceBookLookup: mocks.priceBookLookup,
  expirePricebookVersion: mocks.expirePricebookVersion,
}));

import { PricebookApi } from "./pricebook";

const api = new PricebookApi({ db: { url: "" } } as Config);

describe("PricebookApi", () => {
  it("rejects out-of-range credits", async () => {
    await expect(
      api.insert({
        modelCode: "flux-1.1-pro",
        sizeBucket: "standard",
        premiumFlag: false,
        hasInspirationFlag: false,
        credits: 0,
        version: 1,
        effectiveFrom: "2026-04-25T00:00:00Z",
      }),
    ).rejects.toThrow();
  });
});
