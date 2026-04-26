import type { Config } from "@studio/shared/config";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(() => ({})),
  listBrands: vi.fn(async () => [{ id: "b1", name: "Brand" }]),
  getBrand: vi.fn(async () => ({ id: "b1", name: "Brand" })),
  createBrand: vi.fn(async (_db: unknown, _workspaceId: string, input: { name: string }) => ({
    id: "b1",
    ...input,
  })),
  updateBrand: vi.fn(async () => ({ id: "b1" })),
  addBrandAsset: vi.fn(async () => ({ id: "asset_1" })),
  listBrandAssets: vi.fn(async () => [{ id: "asset_1" }]),
  putBytes: vi.fn(async () => undefined),
  describeImage: vi.fn(async () => ({ description: "clean product shot" })),
}));

vi.mock("@studio/db", () => ({
  createDb: mocks.createDb,
  listBrands: mocks.listBrands,
  getBrand: mocks.getBrand,
  createBrand: mocks.createBrand,
  updateBrand: mocks.updateBrand,
  addBrandAsset: mocks.addBrandAsset,
  listBrandAssets: mocks.listBrandAssets,
}));

vi.mock("./url-extract", () => ({
  extractFromUrl: vi.fn(async () => ({
    title: "Acme",
    description: "Brand description",
    candidateLogos: ["https://example.com/logo.png"],
    dominantColors: ["#000000"],
  })),
}));

import { BrandApi } from "./brand";

const config = {
  auth: { mode: "dev" as const, devUserId: "00000000-0000-0000-0000-000000000001" },
  db: { url: "postgres://example.test/studio" },
  storage: {
    mode: "minio" as const,
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    accessKeyId: "minio",
    secretAccessKey: "minio12345",
    bucketApp: "studio-app",
    bucketGlobal: "studio-global",
    cloudfrontDomain: undefined,
  },
  queue: {
    mode: "elasticmq" as const,
    endpoint: "http://localhost:9324",
    region: "us-east-1",
    generationsQueue: "studio-generations",
    captionsQueue: "studio-captions",
    dlq: "studio-generations-dlq",
  },
  billing: {
    mode: "stub" as const,
    stripeSecretKey: undefined,
    webhookSecret: undefined,
    prices: {
      free: undefined,
      starter: undefined,
      pro: undefined,
      business: undefined,
      agency: undefined,
    },
    topupPrices: {
      p200: undefined,
      p750: undefined,
      p2500: undefined,
    },
  },
  ai: {
    mode: "mock" as const,
    openaiKey: undefined,
    anthropicKey: undefined,
    replicateToken: undefined,
    recraftKey: undefined,
    bflKey: undefined,
    bedrockRegion: "us-east-1",
  },
  email: { mode: "mailpit" as const, resendKey: undefined, from: "studio@example.com" },
  observability: { mode: "none" as const, sentryDsn: undefined, environment: "local" },
  appUrl: "http://localhost:3000",
} satisfies Config;

const adapters = {
  storage: {
    putBytes: mocks.putBytes,
  },
  ai: {
    describeImage: mocks.describeImage,
  },
} as never;

describe("BrandApi", () => {
  const api = new BrandApi(config, adapters);

  it("creates a brand", async () => {
    const result = await api.create("00000000-0000-0000-0000-000000000010", { name: "Acme" });
    expect(result.name).toBe("Acme");
  });

  it("sanitizes and uploads svg logos", async () => {
    const result = await api.uploadLogo("w1", "b1", {
      bytes: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>',
        "utf8",
      ),
      mimeType: "image/svg+xml",
      filename: "logo.svg",
    });

    expect(result.mimeType).toBe("image/svg+xml");
    expect(mocks.putBytes).toHaveBeenCalled();
    expect(mocks.addBrandAsset).toHaveBeenCalled();
  });

  it("extracts metadata from a URL", async () => {
    const result = await api.extractFromUrl({ url: "https://example.com" });
    expect(result.title).toBe("Acme");
  });
});
