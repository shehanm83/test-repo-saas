import { randomUUID } from "node:crypto";

import {
  addBrandAsset,
  createBrand,
  createDb,
  getBrand,
  listBrandAssets,
  listBrands,
  updateBrand,
} from "@vyora/db";
import type { Adapters } from "@vyora/shared/adapters";
import type { Config } from "@vyora/shared/config";
import { keys } from "@vyora/storage";
import { z } from "zod";
import type { UrlExtraction } from "./url-extract";

const BrandCreateInput = z.object({
  name: z.string().min(1).max(120),
  sourceUrl: z.string().url().optional(),
});

const BrandUpdateInput = z.object({
  name: z.string().min(1).max(120).optional(),
  palette: z
    .object({
      primary: z.string(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
      extras: z.array(z.string()).optional(),
    })
    .optional(),
  fonts: z
    .object({
      heading: z.object({ family: z.string(), weight: z.string().optional() }),
      body: z.object({ family: z.string(), weight: z.string().optional() }),
    })
    .optional(),
  voiceNotes: z.string().max(2000).optional(),
});

export class BrandApi {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  private db() {
    return createDb(this.config.db.url, "app_user");
  }

  async list(workspaceId: string) {
    return listBrands(this.db(), workspaceId);
  }

  async get(workspaceId: string, brandId: string) {
    return getBrand(this.db(), workspaceId, brandId);
  }

  async create(workspaceId: string, input: unknown) {
    const args = BrandCreateInput.parse(input);
    return createBrand(this.db(), workspaceId, {
      name: args.name,
      ...(args.sourceUrl ? { sourceUrl: args.sourceUrl } : {}),
    });
  }

  async update(workspaceId: string, brandId: string, input: unknown) {
    const args = BrandUpdateInput.parse(input);
    const palette = args.palette
      ? {
          primary: args.palette.primary,
          ...(args.palette.secondary ? { secondary: args.palette.secondary } : {}),
          ...(args.palette.accent ? { accent: args.palette.accent } : {}),
          ...(args.palette.extras ? { extras: args.palette.extras } : {}),
        }
      : undefined;
    const fonts = args.fonts
      ? {
          heading: {
            family: args.fonts.heading.family,
            ...(args.fonts.heading.weight ? { weight: args.fonts.heading.weight } : {}),
          },
          body: {
            family: args.fonts.body.family,
            ...(args.fonts.body.weight ? { weight: args.fonts.body.weight } : {}),
          },
        }
      : undefined;

    return updateBrand(this.db(), workspaceId, brandId, {
      ...(args.name ? { name: args.name } : {}),
      ...(palette ? { palette } : {}),
      ...(fonts ? { fonts } : {}),
      ...(args.voiceNotes ? { voiceNotes: args.voiceNotes } : {}),
    });
  }

  async uploadLogo(
    workspaceId: string,
    brandId: string,
    file: { bytes: Buffer; mimeType: string; filename: string },
  ) {
    if (file.bytes.byteLength > 10 * 1024 * 1024) {
      throw new Error("file-too-large");
    }

    let storedKey: string;
    let storedMime: string;
    let width: number | null = null;
    let height: number | null = null;

    if (file.mimeType === "image/svg+xml" || file.filename.endsWith(".svg")) {
      const { sanitizeSvg } = await import("./sanitize/svg");
      const cleaned = sanitizeSvg(file.bytes.toString("utf8"));
      storedKey = keys.brandLogo(workspaceId, brandId, "svg");
      storedMime = "image/svg+xml";
      await this.adapters.storage.putBytes(storedKey, Buffer.from(cleaned, "utf8"), storedMime);
    } else {
      const { reencodeImage } = await import("./sanitize/image");
      const reencoded = await reencodeImage(file.bytes, { format: "png", maxLongEdge: 2048 });
      storedKey = keys.brandLogo(workspaceId, brandId, "png");
      storedMime = reencoded.mimeType;
      width = reencoded.width;
      height = reencoded.height;
      await this.adapters.storage.putBytes(storedKey, reencoded.bytes, storedMime);
    }

    await updateBrand(this.db(), workspaceId, brandId, { logoS3Key: storedKey });
    await addBrandAsset(this.db(), workspaceId, {
      workspaceId,
      brandId,
      kind: "logo",
      s3Key: storedKey,
      mimeType: storedMime,
      width,
      height,
      bytes: file.bytes.byteLength,
      embedding: null,
    });

    return { s3Key: storedKey, mimeType: storedMime, width, height };
  }

  async uploadReference(
    workspaceId: string,
    brandId: string,
    file: { bytes: Buffer; mimeType: string; filename: string },
  ) {
    const { reencodeImage } = await import("./sanitize/image");
    const reencoded = await reencodeImage(file.bytes, { format: "png", maxLongEdge: 2048 });
    const assetId = randomUUID();
    const storedKey = keys.brandAsset(workspaceId, brandId, assetId, "png");
    await this.adapters.storage.putBytes(storedKey, reencoded.bytes, reencoded.mimeType);

    const description = await this.adapters.ai.describeImage(storedKey);
    const embedding = new Array(1536).fill(0);
    embedding[0] = description.description.length;

    return addBrandAsset(this.db(), workspaceId, {
      id: assetId,
      workspaceId,
      brandId,
      kind: "reference",
      s3Key: storedKey,
      mimeType: reencoded.mimeType,
      width: reencoded.width,
      height: reencoded.height,
      bytes: reencoded.bytes.byteLength,
      embedding,
    });
  }

  async assets(workspaceId: string, brandId: string) {
    return listBrandAssets(this.db(), workspaceId, brandId);
  }

  async extractFromUrl(input: unknown): Promise<UrlExtraction> {
    const { url } = z.object({ url: z.string().url() }).parse(input);
    const { extractFromUrl } = await import("./url-extract");
    return extractFromUrl(url);
  }
}
