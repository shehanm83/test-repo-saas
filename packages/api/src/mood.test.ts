import type { Config } from "@layertone/shared/config";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(() => ({})),
  listAvailableMoods: vi.fn(async () => [{ id: "m1", name: "Christmas" }]),
  adminListMoods: vi.fn(async () => []),
  adminCreateMood: vi.fn(async (_db: unknown, value: Record<string, unknown>) => ({
    id: "m1",
    ...value,
  })),
  adminUpdateMood: vi.fn(async (_db: unknown, id: string, patch: Record<string, unknown>) => ({
    id,
    ...patch,
  })),
  adminBindings: vi.fn(async () => []),
  setBindings: vi.fn(async () => undefined),
}));

vi.mock("@layertone/db", () => ({
  createDb: mocks.createDb,
  listAvailableMoods: mocks.listAvailableMoods,
  adminListMoods: mocks.adminListMoods,
  adminCreateMood: mocks.adminCreateMood,
  adminUpdateMood: mocks.adminUpdateMood,
  adminBindings: mocks.adminBindings,
  setBindings: mocks.setBindings,
}));

import { MoodApi } from "./mood";

const config = { db: { url: "" } } as Config;
const api = new MoodApi(config);

describe("MoodApi", () => {
  it("rejects invalid aspect ratio", async () => {
    await expect(api.listAvailable({ aspectRatio: "100:100" })).rejects.toThrow();
  });

  it("rejects validFrom > validTo", async () => {
    await expect(
      api.adminCreate({
        slug: "x",
        name: "X",
        kind: "seasonal",
        validFrom: "2026-12-01T00:00:00Z",
        validTo: "2026-11-01T00:00:00Z",
        supportedAspectRatios: ["1:1"],
      }),
    ).rejects.toThrow(/validFrom/);
  });

  it("creates a valid mood", async () => {
    const mood = await api.adminCreate({
      slug: "minimal-tech",
      name: "Minimal Tech",
      kind: "evergreen",
      supportedAspectRatios: ["1:1", "4:5"],
    });

    expect(mood.slug).toBe("minimal-tech");
  });

  it("does not reset recipe fields during a lifecycle-only update", async () => {
    await api.adminUpdate("m1", { status: "published" });

    expect(mocks.adminUpdateMood).toHaveBeenLastCalledWith(expect.anything(), "m1", {
      status: "published",
    });
  });
});
