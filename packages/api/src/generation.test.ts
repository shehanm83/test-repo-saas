import type { Adapters, Config } from "@layertone/shared";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { GenerationApi } from "./generation.js";

vi.mock("./workspace-status", () => ({
  assertWorkspaceCanGenerate: vi.fn(async () => undefined),
}));

vi.mock("./aup", () => ({
  scanBriefForAup: vi.fn(() => ({ flagged: false, tags: [] })),
  assertBriefAllowed: vi.fn(async () => undefined),
}));

// Mock all @layertone/db imports
vi.mock("@layertone/db", () => ({
  createDb: vi.fn(() => ({})),
  listAvailableMoods: vi.fn(async () => [{ id: "mood-1", supportedAspectRatios: ["1:1", "4:5"] }]),
  pickTemplates: vi.fn(async () => [
    {
      tid: "tpl-1",
      weight: 100,
      slug: "t1",
      preferredModel: "flux-1.1-pro",
      requiresBrowserRender: false,
    },
  ]),
  insertGeneration: vi.fn(async () => ({ id: "gen-1" })),
  insertVariants: vi.fn(async () => [{ id: "var-1" }]),
  getGenerationFull: vi.fn(async () => null),
  getProduct: vi.fn(async () => null),
  updateGenerationInspirationKey: vi.fn(async () => undefined),
  priceBookLookup: vi.fn(async () => ({ creditCost: 10, version: 1 })),
  generations: {},
  workspaces: {},
  auditLog: {},
  and: vi.fn(),
  eq: vi.fn(),
}));

// Mock @layertone/billing
const mockReserve = vi.fn(async () => undefined);

vi.mock("@layertone/billing", () => {
  class InsufficientCredits extends Error {
    constructor(
      public readonly balance: number,
      public readonly needed: number,
    ) {
      super("insufficient-credits");
    }
  }
  const Ledger = vi.fn(function () {
    return {
      reserve: mockReserve,
      commit: vi.fn(async () => undefined),
      release: vi.fn(async () => undefined),
    };
  });
  return { Ledger, InsufficientCredits };
});

// Mock @layertone/storage
vi.mock("@layertone/storage", () => ({
  keys: {
    inspirationUploadStaging: vi.fn((ws: string, uid: string) => `staging/${ws}/${uid}.png`),
    inspirationClaimed: vi.fn((ws: string, gid: string) => `claimed/${ws}/${gid}.png`),
    inspirationClaimedIdx: vi.fn((ws: string, gid: string, idx: number) => `claimed/${ws}/${gid}-${idx}.png`),
  },
}));

type TestAdapters = Pick<Adapters, "storage" | "queue" | "telemetry">;

function makeAdapters(
  overrides: Partial<TestAdapters> = {},
): [TestAdapters, ReturnType<typeof vi.fn>, ReturnType<typeof vi.fn>, ReturnType<typeof vi.fn>] {
  const copySpy = vi.fn(async () => undefined);
  const deleteSpy = vi.fn(async () => undefined);
  const sendSpy = vi.fn(async () => undefined);

  return [
    {
      storage: {
        copy: copySpy,
        delete: deleteSpy,
        getSignedUrl: vi.fn(async () => "https://signed/url"),
        putBytes: vi.fn(async () => undefined),
        getBytes: vi.fn(async () => new Uint8Array()),
        putSignedUrl: vi.fn(async () => ({
          url: "https://signed/upload",
          fields: {},
          expiresAt: new Date(),
        })),
        exists: vi.fn(async () => false),
        ...overrides.storage,
      },
      queue: {
        send: sendSpy,
        receive: vi.fn(async () => []),
        delete: vi.fn(async () => undefined),
        ...overrides.queue,
      },
      telemetry: {
        captureException: vi.fn(),
        metric: vi.fn(),
        startSpan: <T,>(_name: string, fn: () => Promise<T> | T): Promise<T> =>
          Promise.resolve().then(fn),
        ...overrides.telemetry,
      },
    },
    sendSpy,
    copySpy,
    deleteSpy,
  ];
}

function makeConfig(): Pick<Config, "db" | "queue" | "ai"> {
  return {
    db: { url: "postgres://app_user:dev@localhost/studio" },
    queue: {
      mode: "inline",
      endpoint: undefined,
      region: "us-east-1",
      generationsQueue: "http://sqs/generations",
      captionsQueue: "http://sqs/captions",
      dlq: "http://sqs/generations-dlq",
    },
    ai: {
      mode: "mock",
      openaiKey: undefined,
      openaiImageModel: "gpt-image-2",
      openaiTextModel: "gpt-5.4-mini",
      anthropicKey: undefined,
      replicateToken: undefined,
      recraftKey: undefined,
      bflKey: undefined,
      bedrockRegion: "us-east-1",
    },
  };
}

const baseInput = {
  brandId: "00000000-0000-0000-0000-000000000001",
  brief: "Christmas sale 30% off",
  outputTarget: { kind: "social", platform: "instagram", format: "post" },
  flags: {},
};

describe("GenerationApi.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: enqueues messages and returns generationId", async () => {
    const [adapters, sendSpy] = makeAdapters();
    const api = new GenerationApi(makeConfig() as Config, adapters as Adapters);

    const r = await api.create({
      workspaceId: "ws-1",
      userId: "usr-1",
      input: baseInput,
    });

    expect(r.generationId).toBeTruthy();
    expect(r.status).toBe("pending");
    expect(r.variants.length).toBe(4);
    expect(sendSpy).toHaveBeenCalledTimes(4);
  });

  it("creates the requested number of commercial samples even when one template matches", async () => {
    const [adapters, sendSpy] = makeAdapters();
    const api = new GenerationApi(makeConfig() as Config, adapters as Adapters);

    const r = await api.create({
      workspaceId: "ws-1",
      userId: "usr-1",
      input: {
        mode: "quick",
        creationType: "single_product",
        brief: "Clean product image on a simple background",
        productRefs: [],
        campaign: {},
        template: { family: "product_hero", layout: "centered_product_hero" },
        outputs: {
          variants: 2,
          quality: "standard",
          consistency: "off",
          formats: ["instagram_square"],
        },
      },
    });

    expect(r.variants).toHaveLength(2);
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it("rejects when no templates found", async () => {
    const { pickTemplates } = await import("@layertone/db");
    vi.mocked(pickTemplates).mockResolvedValueOnce([]);
    const [adapters] = makeAdapters();
    const api = new GenerationApi(makeConfig() as Config, adapters as Adapters);
    await expect(
      api.create({ workspaceId: "ws", userId: "u", input: baseInput }),
    ).rejects.toMatchObject({
      code: "validation.no_template",
      httpStatus: 404,
    });
  });

  it("throws 402 billing code when insufficient credits", async () => {
    const { InsufficientCredits } = await import("@layertone/billing");
    mockReserve.mockRejectedValueOnce(new InsufficientCredits(0, 10));
    const [adapters] = makeAdapters();
    const api = new GenerationApi(makeConfig() as Config, adapters as Adapters);
    await expect(
      api.create({ workspaceId: "ws", userId: "u", input: baseInput }),
    ).rejects.toMatchObject({
      code: "billing.insufficient_credits",
      httpStatus: 402,
    });
  });

  it("copies inspiration upload and deletes staging key", async () => {
    const [adapters, , copySpy, deleteSpy] = makeAdapters();
    const api = new GenerationApi(makeConfig() as Config, adapters as Adapters);
    await api.create({
      workspaceId: "ws-1",
      userId: "usr-1",
      input: { ...baseInput, inspirationUploadId: "00000000-0000-0000-0000-000000000099" },
    });
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it("accepts commercial campaign input and stores a commercial snapshot", async () => {
    const { insertGeneration } = await import("@layertone/db");
    const [adapters] = makeAdapters();
    const api = new GenerationApi(makeConfig() as Config, adapters as Adapters);

    await api.create({
      workspaceId: "ws-1",
      userId: "usr-1",
      input: {
        mode: "campaign_builder",
        creationType: "social_ad_pack",
        brandId: "00000000-0000-0000-0000-000000000001",
        productRefs: [
          {
            uploadId: "00000000-0000-0000-0000-000000000099",
            role: "hero",
            commercialFields: { name: "Serum" },
          },
        ],
        campaign: { title: "Glow launch", cta: "Shop now" },
        template: { family: "social_ad", layout: "split" },
        outputs: {
          variants: 2,
          quality: "standard",
          consistency: "same_mood",
          formats: ["instagram_square"],
        },
      },
    });

    expect(insertGeneration).toHaveBeenCalledWith(
      expect.anything(),
      "ws-1",
      expect.objectContaining({
        brief: expect.stringContaining("Glow launch"),
        settings: expect.objectContaining({
          commercial: expect.objectContaining({
            creation_type: "social_ad_pack",
            campaign: expect.objectContaining({ cta: "Shop now" }),
          }),
        }),
      }),
    );
  });
});
