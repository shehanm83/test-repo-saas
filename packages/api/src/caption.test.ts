import { describe, expect, it, vi, beforeEach } from "vitest";

import { CaptionApi } from "./caption.js";

vi.mock("./workspace-status", () => ({
  assertWorkspaceCanGenerate: vi.fn(async () => undefined),
}));

vi.mock("./aup", () => ({
  scanBriefForAup: vi.fn(() => ({ flagged: false, tags: [] })),
  assertBriefAllowed: vi.fn(async () => undefined),
}));

vi.mock("@vyora/db", () => ({
  createDb: vi.fn(() => ({})),
  getGenerationFull: vi.fn(async () => ({
    brief: "A clean launch image for a skincare serum",
    settings: {
      output_target: {
        platform: "instagram",
        format: "post",
        width: 1080,
        height: 1080,
        aspectRatio: "1:1",
      },
      commercial: {
        creation_type: "single_product",
        campaign: { cta: "Shop now" },
        prompt: { rendered_prompt: "Create a premium skincare launch image." },
      },
    },
  })),
  insertCaption: vi.fn(async () => ({ id: "cap-1" })),
  workspaces: {},
  auditLog: {},
  eq: vi.fn(),
}));

const mockReserve = vi.fn(async () => undefined);

vi.mock("@vyora/billing", () => {
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
  telemetry: {
    captureException: vi.fn(),
    metric: vi.fn(),
    startSpan: <T,>(_name: string, fn: () => Promise<T> | T) => Promise.resolve().then(fn),
  },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CaptionApi.create", () => {
  it("reserves fixed credits and enqueues a detailed caption job", async () => {
    const { insertCaption } = await import("@vyora/db");
    const api = new CaptionApi(BASE_CONFIG, BASE_ADAPTERS);
    const result = await api.create({
      workspaceId: "ws-1",
      userId: "user-1",
      input: {
        brief: "Product launch excitement",
        tone: "warm",
        includeGenerationContext: true,
        short: true,
      },
    });

    expect(result.status).toBe("pending");
    expect(result.reservedCredits).toBe(5);
    expect(mockReserve).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "ws-1", amount: 5 }),
    );
    expect(insertCaption).toHaveBeenCalledWith(
      expect.anything(),
      "ws-1",
      expect.objectContaining({
        lengthTier: "short",
        creditCost: 5,
        voice: expect.stringContaining("Tone: warm"),
      }),
    );
    expect(insertCaption).toHaveBeenCalledWith(
      expect.anything(),
      "ws-1",
      expect.objectContaining({
        voice: expect.stringContaining("Use approved generation context"),
      }),
    );
    expect(mockSend).toHaveBeenCalledWith(
      "http://localhost/captions",
      expect.objectContaining({ workspaceId: "ws-1" }),
      expect.anything(),
    );
  });

  it("uses fixed 5 credit pricing for medium captions", async () => {
    const api = new CaptionApi(BASE_CONFIG, BASE_ADAPTERS);
    const result = await api.create({
      workspaceId: "ws-1",
      userId: "user-1",
      input: { brief: "Brand story for newsletter", lengthTier: "medium" },
    });
    expect(result.reservedCredits).toBe(5);
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

  it("uses standard generation UUIDs for approved context", async () => {
    const { getGenerationFull, insertCaption } = await import("@vyora/db");
    const generationId = "123e4567-e89b-12d3-a456-426614174000";
    const api = new CaptionApi(BASE_CONFIG, BASE_ADAPTERS);

    await api.create({
      workspaceId: "ws-1",
      userId: "user-1",
      input: {
        generationId,
        brief: "Caption from generated image",
        includeGenerationContext: true,
      },
    });

    expect(getGenerationFull).toHaveBeenCalledWith(expect.anything(), "ws-1", generationId);
    expect(insertCaption).toHaveBeenCalledWith(
      expect.anything(),
      "ws-1",
      expect.objectContaining({
        generationId,
        voice: expect.stringContaining("Original image brief: A clean launch image for a skincare serum"),
      }),
    );
  });

  it("does not reject malformed generation ids from old clients", async () => {
    const { getGenerationFull, insertCaption } = await import("@vyora/db");
    const api = new CaptionApi(BASE_CONFIG, BASE_ADAPTERS);

    await api.create({
      workspaceId: "ws-1",
      userId: "user-1",
      input: {
        generationId: "not-a-generation-uuid",
        brief: "Caption without stored context",
        includeGenerationContext: true,
      },
    });

    expect(getGenerationFull).not.toHaveBeenCalled();
    expect(insertCaption).toHaveBeenCalledWith(
      expect.anything(),
      "ws-1",
      expect.objectContaining({
        generationId: null,
        voice: expect.stringContaining("Use approved generation context: not approved by user"),
      }),
    );
  });

  it("throws AppError 402 when reserve fails (insufficient credits)", async () => {
    const { InsufficientCredits } = await import("@vyora/billing");
    mockReserve.mockRejectedValueOnce(new InsufficientCredits(0, 3));

    const api = new CaptionApi(BASE_CONFIG, BASE_ADAPTERS);
    await expect(
      api.create({
        workspaceId: "ws-1",
        userId: "user-1",
        input: { brief: "Caption for product", lengthTier: "medium" },
      }),
    ).rejects.toMatchObject({
      code: "billing.insufficient_credits",
      httpStatus: 402,
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});
