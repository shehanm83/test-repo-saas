import { randomUUID } from "node:crypto";

import {
  addBrandAsset,
  createBrand,
  createDb,
  deleteBrandAsset,
  getBrand,
  listBrandAssets,
  listBrands,
  updateBrand,
} from "@layertone/db";
import type { Adapters } from "@layertone/shared/adapters";
import type { Config } from "@layertone/shared/config";
import { keys } from "@layertone/storage";
import { z } from "zod";
import type { UrlExtraction } from "./url-extract";

const BrandCreateInput = z.object({
  name: z.string().min(1).max(120),
  sourceUrl: z.string().url().optional(),
});

const BrandUpdateInput = z.object({
  name: z.string().min(1).max(120).optional(),
  sourceUrl: z.string().url().nullable().optional(),
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

const RASTER_IMAGE_EXTENSIONS: Record<string, { ext: "png" | "jpg" | "webp"; mimeType: string }> = {
  "image/png": { ext: "png", mimeType: "image/png" },
  "image/jpeg": { ext: "jpg", mimeType: "image/jpeg" },
  "image/webp": { ext: "webp", mimeType: "image/webp" },
};

function rasterImageStorage(file: { mimeType: string; filename: string }) {
  const normalizedMime = file.mimeType.toLowerCase();
  if (RASTER_IMAGE_EXTENSIONS[normalizedMime]) return RASTER_IMAGE_EXTENSIONS[normalizedMime];

  const name = file.filename.toLowerCase();
  if (name.endsWith(".png")) return RASTER_IMAGE_EXTENSIONS["image/png"];
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return RASTER_IMAGE_EXTENSIONS["image/jpeg"];
  if (name.endsWith(".webp")) return RASTER_IMAGE_EXTENSIONS["image/webp"];
  return null;
}

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
      ...(args.sourceUrl !== undefined ? { sourceUrl: args.sourceUrl } : {}),
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
    const assetId = randomUUID();

    if (file.mimeType === "image/svg+xml" || file.filename.endsWith(".svg")) {
      const { sanitizeSvg } = await import("./sanitize/svg");
      const cleaned = sanitizeSvg(file.bytes.toString("utf8"));
      storedKey = keys.brandAsset(workspaceId, brandId, assetId, "svg");
      storedMime = "image/svg+xml";
      await this.adapters.storage.putBytes(storedKey, Buffer.from(cleaned, "utf8"), storedMime);
    } else {
      const storage = rasterImageStorage(file);
      if (!storage) {
        throw new Error("unsupported-logo-format");
      }
      storedKey = keys.brandAsset(workspaceId, brandId, assetId, storage.ext);
      storedMime = storage.mimeType;
      await this.adapters.storage.putBytes(storedKey, file.bytes, storedMime);
    }

    await updateBrand(this.db(), workspaceId, brandId, { logoS3Key: storedKey });
    const asset = await addBrandAsset(this.db(), workspaceId, {
      id: assetId,
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

    return { id: asset.id, s3Key: storedKey, mimeType: storedMime, width, height };
  }

  async uploadReference(
    workspaceId: string,
    brandId: string,
    file: { bytes: Buffer; mimeType: string; filename: string },
  ) {
    const assetId = randomUUID();
    const storage = rasterImageStorage(file);
    if (!storage) {
      throw new Error("unsupported-reference-format");
    }

    let bytes = file.bytes;
    let mimeType = storage.mimeType;
    let width: number | null = null;
    let height: number | null = null;
    let ext = storage.ext;

    try {
      const { reencodeImage } = await import("./sanitize/image");
      const reencoded = await reencodeImage(file.bytes, { format: "png", maxLongEdge: 2048 });
      bytes = reencoded.bytes;
      mimeType = reencoded.mimeType;
      width = reencoded.width;
      height = reencoded.height;
      ext = "png";
    } catch {
      // In dev builds sharp can be unavailable. Store the original user image so
      // brand setup remains functional; production installs should re-encode.
    }

    const storedKey = keys.brandAsset(workspaceId, brandId, assetId, ext);
    await this.adapters.storage.putBytes(storedKey, bytes, mimeType);

    const { description } = await this.adapters.ai.describeImage(storedKey);
    const { vector: embedding } = await this.adapters.ai.embedText(description).catch(() => ({ vector: new Array(1536).fill(0) as number[] }));

    return addBrandAsset(this.db(), workspaceId, {
      id: assetId,
      workspaceId,
      brandId,
      kind: "reference",
      s3Key: storedKey,
      mimeType,
      width,
      height,
      bytes: bytes.byteLength,
      embedding,
    });
  }

  async assets(workspaceId: string, brandId: string) {
    return listBrandAssets(this.db(), workspaceId, brandId);
  }

  async deleteAsset(workspaceId: string, brandId: string, assetId: string) {
    const asset = await deleteBrandAsset(this.db(), workspaceId, brandId, assetId);
    if (asset?.s3Key) {
      await this.adapters.storage.delete(asset.s3Key).catch(() => undefined);
    }
    return asset;
  }

  async extractFromUrl(input: unknown): Promise<UrlExtraction> {
    const { url } = z.object({ url: z.string().url() }).parse(input);
    const { extractFromUrl } = await import("./url-extract");
    return extractFromUrl(url);
  }
}
