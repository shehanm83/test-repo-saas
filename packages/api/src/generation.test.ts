import type { Adapters, Config } from "@studio/shared";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { GenerationApi } from "./generation.js";

vi.mock("./workspace-status", () => ({
  assertWorkspaceCanGenerate: vi.fn(async () => undefined),
}));

vi.mock("./aup", () => ({
  scanBriefForAup: vi.fn(() => ({ flagged: false, tags: [] })),
  assertBriefAllowed: vi.fn(async () => undefined),
}));

// Mock all @studio/db imports
vi.mock("@studio/db", () => ({
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
  updateGenerationInspirationKey: vi.fn(async () => undefined),
  priceBookLookup: vi.fn(async () => ({ creditCost: 10, version: 1 })),
  generations: {},
  workspaces: {},
  auditLog: {},
  and: vi.fn(),
  eq: vi.fn(),
}));

// Mock @studio/billing
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
    return {
      reserve: mockReserve,
      commit: vi.fn(async () => undefined),
      release: vi.fn(async () => undefined),
    };
  });
  return { Ledger, InsufficientCredits };
});

// Mock @studio/storage
vi.mock("@studio/storage", () => ({
  keys: {
    inspirationUploadStaging: vi.fn((ws: string, uid: string) => `staging/${ws}/${uid}.png`),
    inspirationClaimed: vi.fn((ws: string, gid: string) => `claimed/${ws}/${gid}.png`),
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

function makeConfig(): Pick<Config, "db" | "queue"> {
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
    expect(r.variants.length).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects when no templates found", async () => {
    const { pickTemplates } = await import("@studio/db");
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
    const { InsufficientCredits } = await import("@studio/billing");
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
});
