import { describe, expect, it, vi, beforeEach } from "vitest";

import { CaptionApi } from "./caption.js";

vi.mock("@studio/db", () => ({
  createDb: vi.fn(() => ({})),
  insertCaption: vi.fn(async () => ({ id: "cap-1" })),
}));

const mockReserve = vi.fn(async () => undefined);

vi.mock("@studio/billing", () => {
  class InsufficientCredits extends Error {
    constructor(
      public readonly balance: number,
      public readonly needed: number,
    ) {
      super("insufficient-credits");
    }
  }
  const Ledger = vi.fn(function () {
    return { reserve: mockReserve };
  });
  return { Ledger, InsufficientCredits };
});

const mockSend = vi.fn(async () => undefined);

const BASE_CONFIG = {
  db: { url: "postgres://x" },
  queue: { captionsQueue: "http://localhost/captions" },
} as never;

const BASE_ADAPTERS = {
  queue: { send: mockSend },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CaptionApi.create", () => {
  it("reserves credits and enqueues message for short caption", async () => {
    const api = new CaptionApi(BASE_CONFIG, BASE_ADAPTERS);
    const result = await api.create({
      workspaceId: "ws-1",
      userId: "user-1",
      input: { brief: "Product launch excitement", lengthTier: "short" },
    });

    expect(result.status).toBe("pending");
    expect(result.reservedCredits).toBe(1);
    expect(mockReserve).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "ws-1", amount: 1 }),
    );
    expect(mockSend).toHaveBeenCalledWith(
      "http://localhost/captions",
      expect.objectContaining({ workspaceId: "ws-1" }),
      expect.anything(),
    );
  });

  it("reserves 3 credits for medium tier", async () => {
    const api = new CaptionApi(BASE_CONFIG, BASE_ADAPTERS);
    const result = await api.create({
      workspaceId: "ws-1",
      userId: "user-1",
      input: { brief: "Brand story for newsletter", lengthTier: "medium" },
    });
    expect(result.reservedCredits).toBe(3);
  });

  it("reserves 5 credits for long tier", async () => {
    const api = new CaptionApi(BASE_CONFIG, BASE_ADAPTERS);
    const result = await api.create({
      workspaceId: "ws-1",
      userId: "user-1",
      input: { brief: "Detailed product description", lengthTier: "long" },
    });
    expect(result.reservedCredits).toBe(5);
  });

  it("throws when reserve fails (insufficient credits)", async () => {
    const { InsufficientCredits } = await import("@studio/billing");
    mockReserve.mockRejectedValueOnce(new InsufficientCredits(0, 3));

    const api = new CaptionApi(BASE_CONFIG, BASE_ADAPTERS);
    await expect(
      api.create({
        workspaceId: "ws-1",
        userId: "user-1",
        input: { brief: "Caption for product", lengthTier: "medium" },
      }),
    ).rejects.toThrow("insufficient-credits");

    expect(mockSend).not.toHaveBeenCalled();
  });
});
