import type { Config } from "@layertone/shared/config";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(() => ({})),
  listProductLines: vi.fn(async () => [{ id: "line_1", name: "Skin care" }]),
  createProductLine: vi.fn(async (_db: unknown, _workspaceId: string, input: { name: string }) => ({
    id: "line_1",
    ...input,
  })),
  updateProductLine: vi.fn(async (_db: unknown, _workspaceId: string, id: string, patch: Record<string, unknown>) => ({
    id,
    ...patch,
  })),
  listProducts: vi.fn(async () => [{ id: "product_1", name: "Serum" }]),
  getProduct: vi.fn(async () => ({ id: "product_1", name: "Serum" })),
  createProduct: vi.fn(async (_db: unknown, _workspaceId: string, input: { name: string }) => ({
    id: "product_1",
    ...input,
  })),
  updateProduct: vi.fn(async (_db: unknown, _workspaceId: string, id: string, patch: Record<string, unknown>) => ({
    id,
    ...patch,
  })),
  listProductVariants: vi.fn(async () => []),
  createProductVariant: vi.fn(async (_db: unknown, _workspaceId: string, input: { name: string }) => ({
    id: "variant_1",
    ...input,
  })),
  updateProductVariant: vi.fn(async () => ({ id: "variant_1" })),
  addProductAsset: vi.fn(async (_db: unknown, _workspaceId: string, input: { id: string }) => input),
  listProductAssets: vi.fn(async () => []),
  putBytes: vi.fn(async () => undefined),
}));

vi.mock("@layertone/db", () => ({
  createDb: mocks.createDb,
  listProductLines: mocks.listProductLines,
  createProductLine: mocks.createProductLine,
  updateProductLine: mocks.updateProductLine,
  listProducts: mocks.listProducts,
  getProduct: mocks.getProduct,
  createProduct: mocks.createProduct,
  updateProduct: mocks.updateProduct,
  listProductVariants: mocks.listProductVariants,
  createProductVariant: mocks.createProductVariant,
  updateProductVariant: mocks.updateProductVariant,
  addProductAsset: mocks.addProductAsset,
  listProductAssets: mocks.listProductAssets,
}));

import { ProductApi } from "./product";

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
  },
} as never;

const workspaceId = "00000000-0000-4000-8000-000000000010";
const brandId = "00000000-0000-4000-8000-000000000020";

describe("ProductApi", () => {
  const api = new ProductApi(config, adapters);

  it("creates a product line", async () => {
    const result = await api.createLine(workspaceId, {
      brandId,
      name: "Skin care",
      defaultCurrency: "sek",
    });
    expect(result.name).toBe("Skin care");
    expect(mocks.createProductLine).toHaveBeenCalledWith(expect.anything(), workspaceId, expect.objectContaining({
      defaultCurrency: "SEK",
    }));
  });

  it("creates a product with commercial metadata", async () => {
    const result = await api.create(workspaceId, {
      brandId,
      name: "Serum",
      priceMinor: 24900,
      currency: "usd",
      keyFeatures: ["Vitamin C", "30 ml"],
    });
    expect(result.name).toBe("Serum");
    expect(mocks.createProduct).toHaveBeenCalledWith(expect.anything(), workspaceId, expect.objectContaining({
      currency: "USD",
      keyFeatures: ["Vitamin C", "30 ml"],
    }));
  });

  it("archives products instead of deleting them", async () => {
    await api.archive(workspaceId, "product_1");
    expect(mocks.updateProduct).toHaveBeenCalledWith(expect.anything(), workspaceId, "product_1", {
      status: "archived",
    });
  });
});
