import type { Config } from "@layertone/shared/config";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  deleteBrandAsset: vi.fn(async () => ({ id: "asset_1", s3Key: "logo.png" })),
  getBrandQuotaStatus: vi.fn(async () => ({ used: 0, limit: 3 })),
  putBytes: vi.fn(async () => undefined),
  deleteObject: vi.fn(async () => undefined),
  describeImage: vi.fn(async () => ({ description: "clean product shot" })),
  embedText: vi.fn(async () => ({ vector: new Array(1536).fill(0) as number[] })),
  reencodeImage: vi.fn(async () => ({
    bytes: Buffer.from("png-bytes"),
    mimeType: "image/png" as const,
    width: 1200,
    height: 300,
  })),
}));

vi.mock("@layertone/db", () => ({
  createDb: mocks.createDb,
  listBrands: mocks.listBrands,
  getBrand: mocks.getBrand,
  createBrand: mocks.createBrand,
  updateBrand: mocks.updateBrand,
  addBrandAsset: mocks.addBrandAsset,
  listBrandAssets: mocks.listBrandAssets,
  deleteBrandAsset: mocks.deleteBrandAsset,
  getBrandQuotaStatus: mocks.getBrandQuotaStatus,
}));

vi.mock("./sanitize/image", () => ({ reencodeImage: mocks.reencodeImage }));

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
  db: { url: "postgres://example.test/layertone" },
  storage: {
    mode: "minio" as const,
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    accessKeyId: "minio",
    secretAccessKey: "minio12345",
    bucketApp: "layertone-app",
    bucketGlobal: "layertone-global",
    cloudfrontDomain: undefined,
  },
  queue: {
    mode: "elasticmq" as const,
    endpoint: "http://localhost:9324",
    region: "us-east-1",
    generationsQueue: "layertone-generations",
    captionsQueue: "layertone-captions",
    dlq: "layertone-generations-dlq",
  },
  billing: {
    mode: "stub" as const,
    stripeSecretKey: undefined,
    webhookSecret: undefined,
    prices: {
      free: undefined,
      subscription: undefined,
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
    openaiImageModel: "gpt-image-2",
    openaiTextModel: "gpt-5.4-mini",
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
    delete: mocks.deleteObject,
  },
  ai: {
    describeImage: mocks.describeImage,
    embedText: mocks.embedText,
  },
} as never;

/** 1×1 PNG — enough for file-type to sniff a real magic number. */
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("BrandApi", () => {
  const api = new BrandApi(config, adapters);

  beforeEach(() => {
    mocks.getBrandQuotaStatus.mockResolvedValue({ used: 0, limit: 3 });
    mocks.getBrand.mockResolvedValue({ id: "b1", name: "Brand" } as never);
  });

  it("creates a brand", async () => {
    const result = await api.create("00000000-0000-0000-0000-000000000010", { name: "Acme" });
    expect(result.name).toBe("Acme");
  });

  it("refuses to create a brand past the plan's quota", async () => {
    mocks.getBrandQuotaStatus.mockResolvedValue({ used: 1, limit: 1 });

    await expect(
      api.create("00000000-0000-0000-0000-000000000010", { name: "Second" }),
    ).rejects.toMatchObject({ code: "billing.brand_quota_exceeded", httpStatus: 403 });
    expect(mocks.createBrand).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ name: "Second" }),
    );
  });

  it("sanitizes svg logos and records their intrinsic size", async () => {
    const result = await api.uploadLogo("w1", "b1", {
      bytes: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><script>alert(1)</script><circle r="5"/></svg>',
        "utf8",
      ),
      mimeType: "image/svg+xml",
      filename: "logo.svg",
    });

    expect(result.mimeType).toBe("image/svg+xml");
    expect(result.width).toBe(400);
    expect(result.height).toBe(100);
    expect(mocks.putBytes).toHaveBeenCalled();
    expect(mocks.addBrandAsset).toHaveBeenCalledWith(
      expect.anything(),
      "w1",
      expect.objectContaining({ width: 400, height: 100 }),
    );
  });

  it("re-encodes raster logos and stores their real dimensions", async () => {
    const result = await api.uploadLogo("w1", "b1", {
      bytes: PNG_BYTES,
      mimeType: "image/png",
      filename: "logo.png",
    });

    expect(result.mimeType).toBe("image/png");
    expect(result.width).toBe(1200);
    expect(result.height).toBe(300);
    expect(mocks.reencodeImage).toHaveBeenCalled();
    expect(mocks.addBrandAsset).toHaveBeenCalledWith(
      expect.anything(),
      "w1",
      expect.objectContaining({ width: 1200, height: 300 }),
    );
  });

  it("rejects a logo whose bytes are not a supported image", async () => {
    await expect(
      api.uploadLogo("w1", "b1", {
        bytes: Buffer.from("MZ\u0000\u0000 not an image", "utf8"),
        mimeType: "image/png",
        filename: "logo.png",
      }),
    ).rejects.toMatchObject({ code: "validation.invalid_image", httpStatus: 415 });
  });

  it("repoints the brand logo key when the named logo asset is deleted", async () => {
    mocks.getBrand.mockResolvedValue({ id: "b1", logoS3Key: "logo.png" } as never);
    mocks.listBrandAssets.mockResolvedValue([
      { id: "asset_2", kind: "logo", s3Key: "other-logo.png" },
    ] as never);

    await api.deleteAsset("w1", "b1", "asset_1");

    expect(mocks.updateBrand).toHaveBeenCalledWith(expect.anything(), "w1", "b1", {
      logoS3Key: "other-logo.png",
    });
    expect(mocks.deleteObject).toHaveBeenCalledWith("logo.png");
  });

  it("extracts metadata from a URL", async () => {
    const result = await api.extractFromUrl({ url: "https://example.com" });
    expect(result.title).toBe("Acme");
  });
});
