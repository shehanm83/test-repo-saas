import { randomUUID } from "node:crypto";

import {
  addProductAsset,
  createDb,
  createProduct,
  createProductLine,
  createProductVariant,
  getProduct,
  listProductAssets,
  listProductLines,
  listProducts,
  listProductVariants,
  updateProduct,
  updateProductLine,
  updateProductVariant,
} from "@vyora/db";
import type { Adapters } from "@vyora/shared/adapters";
import type { Config } from "@vyora/shared/config";
import { keys } from "@vyora/storage";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";

const UUID = z.string().uuid();
const Status = z.enum(["draft", "active", "archived"]);
const Currency = z.string().min(3).max(3).transform((v) => v.toUpperCase());
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

const ProductLineCreateInput = z.object({
  brandId: UUID,
  name: z.string().min(1).max(160),
  category: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  targetAudience: z.string().max(500).optional().nullable(),
  defaultCurrency: Currency.optional(),
  status: Status.optional(),
});

const ProductLineUpdateInput = ProductLineCreateInput.omit({ brandId: true }).partial();

const ProductCreateInput = z.object({
  productLineId: UUID.optional().nullable(),
  brandId: UUID,
  name: z.string().min(1).max(180),
  brandLabel: z.string().max(120).optional().nullable(),
  model: z.string().max(120).optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  category: z.string().max(120).optional().nullable(),
  title: z.string().max(180).optional().nullable(),
  subtitle: z.string().max(240).optional().nullable(),
  description: z.string().max(3000).optional().nullable(),
  priceMinor: z.number().int().nonnegative().optional().nullable(),
  compareAtPriceMinor: z.number().int().nonnegative().optional().nullable(),
  currency: Currency.optional(),
  discountText: z.string().max(80).optional().nullable(),
  keyFeatures: z.array(z.string().min(1).max(160)).max(12).optional(),
  benefits: z.array(z.string().min(1).max(160)).max(12).optional(),
  targetAudience: z.string().max(500).optional().nullable(),
  variantAttributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  status: Status.optional(),
});

const ProductUpdateInput = ProductCreateInput.omit({ brandId: true }).partial();

const ProductVariantCreateInput = z.object({
  name: z.string().min(1).max(160),
  sku: z.string().max(120).optional().nullable(),
  color: z.string().max(80).optional().nullable(),
  size: z.string().max(80).optional().nullable(),
  material: z.string().max(120).optional().nullable(),
  flavor: z.string().max(120).optional().nullable(),
  packageQuantity: z.string().max(80).optional().nullable(),
  priceMinor: z.number().int().nonnegative().optional().nullable(),
  compareAtPriceMinor: z.number().int().nonnegative().optional().nullable(),
  currency: Currency.optional().nullable(),
  assetOverrides: z.record(z.string(), z.string()).optional(),
  status: Status.optional(),
});

const ProductVariantUpdateInput = ProductVariantCreateInput.partial();

const AssetKind = z.enum([
  "product",
  "packaging",
  "lifestyle",
  "label_detail",
  "before",
  "after",
  "cutout",
]);

const ProductListInput = z.object({
  brandId: UUID.optional(),
  productLineId: UUID.optional(),
  includeArchived: z.boolean().optional(),
});

const ProductLineListInput = z.object({
  brandId: UUID.optional(),
  includeArchived: z.boolean().optional(),
});

export class ProductApi {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  private db() {
    return createDb(this.config.db.url, "app_user");
  }

  async listLines(workspaceId: string, input: unknown = {}) {
    const args = ProductLineListInput.parse(input);
    return listProductLines(this.db(), workspaceId, compact(args));
  }

  async createLine(workspaceId: string, input: unknown) {
    const args = ProductLineCreateInput.parse(input);
    return createProductLine(this.db(), workspaceId, {
      workspaceId,
      brandId: args.brandId,
      name: args.name,
      category: args.category ?? null,
      description: args.description ?? null,
      targetAudience: args.targetAudience ?? null,
      defaultCurrency: args.defaultCurrency ?? "USD",
      status: args.status ?? "active",
    });
  }

  async updateLine(workspaceId: string, productLineId: string, input: unknown) {
    const args = ProductLineUpdateInput.parse(input);
    return updateProductLine(this.db(), workspaceId, productLineId, compact(args));
  }

  async archiveLine(workspaceId: string, productLineId: string) {
    return updateProductLine(this.db(), workspaceId, productLineId, { status: "archived" });
  }

  async list(workspaceId: string, input: unknown = {}) {
    const args = ProductListInput.parse(input);
    return listProducts(this.db(), workspaceId, compact(args));
  }

  async get(workspaceId: string, productId: string) {
    const product = await getProduct(this.db(), workspaceId, productId);
    if (!product) return null;
    const [variants, assets] = await Promise.all([
      listProductVariants(this.db(), workspaceId, productId),
      listProductAssets(this.db(), workspaceId, productId),
    ]);
    return { ...product, variants, assets };
  }

  async create(workspaceId: string, input: unknown) {
    const args = ProductCreateInput.parse(input);
    return createProduct(this.db(), workspaceId, {
      workspaceId,
      productLineId: args.productLineId ?? null,
      brandId: args.brandId,
      name: args.name,
      brandLabel: args.brandLabel ?? null,
      model: args.model ?? null,
      sku: args.sku ?? null,
      category: args.category ?? null,
      title: args.title ?? null,
      subtitle: args.subtitle ?? null,
      description: args.description ?? null,
      priceMinor: args.priceMinor ?? null,
      compareAtPriceMinor: args.compareAtPriceMinor ?? null,
      currency: args.currency ?? "USD",
      discountText: args.discountText ?? null,
      keyFeatures: args.keyFeatures ?? [],
      benefits: args.benefits ?? [],
      targetAudience: args.targetAudience ?? null,
      variantAttributes: args.variantAttributes ?? {},
      status: args.status ?? "active",
    });
  }

  async update(workspaceId: string, productId: string, input: unknown) {
    const args = ProductUpdateInput.parse(input);
    return updateProduct(this.db(), workspaceId, productId, compact(args));
  }

  async archive(workspaceId: string, productId: string) {
    return updateProduct(this.db(), workspaceId, productId, { status: "archived" });
  }

  async createVariant(workspaceId: string, productId: string, input: unknown) {
    const args = ProductVariantCreateInput.parse(input);
    return createProductVariant(this.db(), workspaceId, {
      workspaceId,
      productId,
      name: args.name,
      sku: args.sku ?? null,
      color: args.color ?? null,
      size: args.size ?? null,
      material: args.material ?? null,
      flavor: args.flavor ?? null,
      packageQuantity: args.packageQuantity ?? null,
      priceMinor: args.priceMinor ?? null,
      compareAtPriceMinor: args.compareAtPriceMinor ?? null,
      currency: args.currency ?? null,
      assetOverrides: args.assetOverrides ?? {},
      status: args.status ?? "active",
    });
  }

  async updateVariant(workspaceId: string, variantId: string, input: unknown) {
    const args = ProductVariantUpdateInput.parse(input);
    return updateProductVariant(this.db(), workspaceId, variantId, compact(args));
  }

  async uploadAsset(
    workspaceId: string,
    productId: string,
    args: {
      kind: z.infer<typeof AssetKind>;
      file: { bytes: Buffer; filename: string };
      productVariantId?: string | null;
      backgroundRemoved?: boolean;
      labelVisibility?: "unknown" | "low" | "medium" | "high";
    },
  ) {
    const kind = AssetKind.parse(args.kind);
    if (args.file.bytes.byteLength > MAX_BYTES) {
      throw new Error("file-too-large");
    }
    const sniffed = await fileTypeFromBuffer(args.file.bytes);
    if (!sniffed || !ALLOWED.has(sniffed.mime)) {
      throw new Error("invalid-image-type");
    }

    const { reencodeImage } = await import("./sanitize/image");
    const reencoded = await reencodeImage(args.file.bytes, { format: "png", maxLongEdge: 2400 });
    const assetId = randomUUID();
    const storedKey = keys.productAsset(workspaceId, productId, assetId, "png");
    await this.adapters.storage.putBytes(storedKey, reencoded.bytes, reencoded.mimeType);

    return addProductAsset(this.db(), workspaceId, {
      id: assetId,
      workspaceId,
      productId,
      productVariantId: args.productVariantId ?? null,
      kind,
      s3Key: storedKey,
      mimeType: reencoded.mimeType,
      width: reencoded.width,
      height: reencoded.height,
      bytes: reencoded.bytes.byteLength,
      hasTransparency: kind === "cutout" || sniffed.mime === "image/png",
      backgroundRemoved: args.backgroundRemoved ?? kind === "cutout",
      qualityScore: scoreImage(reencoded.width, reencoded.height),
      labelVisibility: args.labelVisibility ?? "unknown",
    });
  }
}

type Compact<T extends Record<string, unknown>> = {
  [K in keyof T]?: Exclude<T[K], undefined>;
};

function compact<T extends Record<string, unknown>>(value: T): Compact<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Compact<T>;
}

function scoreImage(width: number, height: number) {
  const longEdge = Math.max(width, height);
  if (longEdge >= 1800) return 90;
  if (longEdge >= 1200) return 75;
  if (longEdge >= 800) return 55;
  return 35;
}
