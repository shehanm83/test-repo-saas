import { describe, expect, it, vi } from "vitest";
import { preFlightModerate, postFlightModerate } from "./safety.js";
import type { ModerationProvider } from "./types.js";

describe("preFlightModerate", () => {
  it("passes when not flagged", async () => {
    const mp: ModerationProvider = {
      moderateText: vi.fn(async () => ({ flagged: false, categories: [] })),
      moderateImage: vi.fn(),
    };
    await expect(preFlightModerate(mp, "safe text")).resolves.toBeUndefined();
  });

  it("throws with safety.text_blocked when flagged", async () => {
    const mp: ModerationProvider = {
      moderateText: vi.fn(async () => ({ flagged: true, categories: ["violence"] })),
      moderateImage: vi.fn(),
    };
    let caught: unknown;
    await preFlightModerate(mp, "bad text").catch((e) => {
      caught = e;
    });
    const err = caught as Error & { code?: string };
    expect(err.message).toMatch(/safety-blocked/);
    expect(err.code).toBe("safety.text_blocked");
  });

  it("is a no-op when mp is null", async () => {
    await expect(preFlightModerate(null, "anything")).resolves.toBeUndefined();
  });
});

describe("postFlightModerate", () => {
  it("throws with safety.image_blocked when flagged", async () => {
    const mp: ModerationProvider = {
      moderateText: vi.fn(),
      moderateImage: vi.fn(async () => ({ flagged: true, categories: ["nsfw"] })),
    };
    let caught: unknown;
    await postFlightModerate(mp, new Uint8Array([1, 2])).catch((e) => {
      caught = e;
    });
    const err = caught as Error & { code?: string };
    expect(err.code).toBe("safety.image_blocked");
  });
});
