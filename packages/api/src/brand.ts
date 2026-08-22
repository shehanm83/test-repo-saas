import { randomUUID } from "node:crypto";

import {
  addBrandAsset,
  createBrand,
  createDb,
  deleteBrandAsset,
  getBrand,
  getBrandQuotaStatus,
  listBrandAssets,
  listBrands,
  updateBrand,
  updateBrandAsset,
} from "@layertone/db";
import type { Adapters } from "@layertone/shared/adapters";
import type { Config } from "@layertone/shared/config";
import { CODES } from "@layertone/shared/errors/codes";
import { AppError } from "@layertone/shared/errors/app-error";
import { findBrandFont, nearestBrandFontWeight } from "@layertone/shared/brand/fonts";
import { keys } from "@layertone/storage";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import type { UrlExtraction } from "./url-extract";

const BrandCreateInput = z.object({
  name: z.string().min(1).max(120),
  sourceUrl: z.string().url().optional(),
});

/**
 * A brand font is only valid if the renderer can fetch it. Weights are snapped to
 * the nearest the family publishes; unknown families are rejected outright rather
 * than silently swapped, because a brand kit quietly changing typeface is worse
 * than being told to pick again.
 */
function BrandFontInput(role: "heading" | "body") {
  return z
    .object({ family: z.string(), weight: z.string().optional() })
    .transform((value, ctx) => {
      const font = findBrandFont(value.family);
      if (!font) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${value.family}" is not a supported ${role} font.`,
          path: ["family"],
        });
        return z.NEVER;
      }
      return {
        family: font.family,
        weight: nearestBrandFontWeight(font, value.weight ?? (role === "heading" ? "700" : "400")),
      };
    });
}

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
      heading: BrandFontInput("heading"),
      body: BrandFontInput("body"),
    })
    .optional(),
  voiceNotes: z.string().max(2000).optional(),
  descriptor: z.string().max(200).nullable().optional(),
  voice: z
    .object({
      tone: z.array(z.string().max(40)).max(8).optional(),
      avoid: z.array(z.string().max(40)).max(8).optional(),
      example: z.string().max(280).optional(),
    })
    .nullable()
    .optional(),
});

/** How a logo is described once it is in the kit. */
const LogoMeta = z.object({
  variant: z.enum(["lockup", "mark", "wordmark", "other"]).optional(),
  background: z.enum(["light", "dark", "any"]).optional(),
  label: z.string().max(80).nullable().optional(),
});

const BrandAssetUpdateInput = LogoMeta.extend({
  isPrimary: z.literal(true).optional(),
});

const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const MAX_LOGO_LONG_EDGE = 2048;
const MAX_REFERENCE_LONG_EDGE = 2048;

/** Raster formats we accept for brand uploads, decided by magic bytes — never by the client. */
const ALLOWED_RASTER_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

function isSvgUpload(file: { mimeType: string; filename: string }): boolean {
  return (
    file.mimeType.toLowerCase() === "image/svg+xml" ||
    file.filename.toLowerCase().endsWith(".svg")
  );
}

async function assertRasterImage(bytes: Buffer): Promise<void> {
  const sniffed = await fileTypeFromBuffer(bytes);
  if (!sniffed || !ALLOWED_RASTER_MIMES.has(sniffed.mime)) {
    throw new AppError(
      CODES.VALIDATION_INVALID_IMAGE,
      "That doesn't look like a supported image (PNG, JPG, WebP, or SVG).",
      415,
    );
  }
}

function assertWithinSizeLimit(bytes: Buffer): void {
  if (bytes.byteLength > MAX_ASSET_BYTES) {
    throw new AppError(CODES.VALIDATION_FILE_TOO_LARGE, "File is too large (max 10 MB).", 413);
  }
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

    const quota = await getBrandQuotaStatus(this.db(), workspaceId);
    if (quota.used >= quota.limit) {
      throw new AppError(
        CODES.BILLING_BRAND_QUOTA_EXCEEDED,
        quota.limit === 1
          ? "Your plan includes one brand. Upgrade to add more."
          : `Your plan includes ${quota.limit} brands. Upgrade to add more.`,
        403,
        { used: quota.used, limit: quota.limit },
      );
    }

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
    const fonts = args.fonts;
    // exactOptionalPropertyTypes: drop absent keys rather than storing undefined.
    const voice =
      args.voice == null
        ? args.voice
        : {
            ...(args.voice.tone ? { tone: args.voice.tone } : {}),
            ...(args.voice.avoid ? { avoid: args.voice.avoid } : {}),
            ...(args.voice.example ? { example: args.voice.example } : {}),
          };

    const patch = {
      ...(args.name ? { name: args.name } : {}),
      ...(args.sourceUrl !== undefined ? { sourceUrl: args.sourceUrl } : {}),
      ...(palette ? { palette } : {}),
      ...(fonts ? { fonts } : {}),
      ...(args.voiceNotes !== undefined ? { voiceNotes: args.voiceNotes } : {}),
      ...(args.descriptor !== undefined ? { descriptor: args.descriptor } : {}),
      ...(args.voice !== undefined ? { voice } : {}),
    };

    if (Object.keys(patch).length === 0) {
      return getBrand(this.db(), workspaceId, brandId);
    }

    return updateBrand(this.db(), workspaceId, brandId, patch);
  }

  async uploadLogo(
    workspaceId: string,
    brandId: string,
    file: { bytes: Buffer; mimeType: string; filename: string },
    meta?: unknown,
  ) {
    const described = LogoMeta.parse(meta ?? {});
    assertWithinSizeLimit(file.bytes);

    const assetId = randomUUID();
    let storedKey: string;
    let storedMime: string;
    let storedBytes: Buffer;
    let width: number | null = null;
    let height: number | null = null;

    if (isSvgUpload(file)) {
      const { sanitizeSvg, svgDimensions } = await import("./sanitize/svg");
      const cleaned = sanitizeSvg(file.bytes.toString("utf8"));
      const dimensions = svgDimensions(cleaned);
      width = dimensions?.width ?? null;
      height = dimensions?.height ?? null;
      storedKey = keys.brandAsset(workspaceId, brandId, assetId, "svg");
      storedMime = "image/svg+xml";
      storedBytes = Buffer.from(cleaned, "utf8");
    } else {
      await assertRasterImage(file.bytes);
      // Re-encode to strip EXIF and any trailing payload, and to learn the real
      // aspect ratio — the renderer composites the logo at these dimensions, so a
      // missing size silently squashes every wordmark into a square.
      const { reencodeImage } = await import("./sanitize/image");
      const reencoded = await reencodeImage(file.bytes, {
        format: "png",
        maxLongEdge: MAX_LOGO_LONG_EDGE,
      });
      storedKey = keys.brandAsset(workspaceId, brandId, assetId, "png");
      storedMime = reencoded.mimeType;
      storedBytes = reencoded.bytes;
      width = reencoded.width;
      height = reencoded.height;
    }

    await this.adapters.storage.putBytes(storedKey, storedBytes, storedMime);

    // The first logo a brand gets is the one the renderer will reach for.
    const existing = await listBrandAssets(this.db(), workspaceId, brandId);
    const isPrimary = !existing.some((candidate) => candidate.isPrimary);

    const asset = await addBrandAsset(this.db(), workspaceId, {
      id: assetId,
      workspaceId,
      brandId,
      kind: "logo",
      variant: described.variant ?? "lockup",
      background: described.background ?? "any",
      label: described.label ?? null,
      isPrimary,
      s3Key: storedKey,
      mimeType: storedMime,
      width,
      height,
      bytes: storedBytes.byteLength,
      embedding: null,
    });

    if (isPrimary) {
      await updateBrand(this.db(), workspaceId, brandId, { logoS3Key: storedKey });
    }

    return {
      id: asset.id,
      s3Key: storedKey,
      mimeType: storedMime,
      width,
      height,
      variant: asset.variant,
      background: asset.background,
      label: asset.label,
      isPrimary: asset.isPrimary,
    };
  }

  async uploadReference(
    workspaceId: string,
    brandId: string,
    file: { bytes: Buffer; mimeType: string; filename: string },
  ) {
    assertWithinSizeLimit(file.bytes);
    await assertRasterImage(file.bytes);

    const assetId = randomUUID();
    const { reencodeImage } = await import("./sanitize/image");
    const reencoded = await reencodeImage(file.bytes, {
      format: "png",
      maxLongEdge: MAX_REFERENCE_LONG_EDGE,
    });

    const storedKey = keys.brandAsset(workspaceId, brandId, assetId, "png");
    await this.adapters.storage.putBytes(storedKey, reencoded.bytes, reencoded.mimeType);

    const { description } = await this.adapters.ai.describeImage(storedKey);
    const { vector: embedding } = await this.adapters.ai
      .embedText(description)
      .catch(() => ({ vector: new Array(1536).fill(0) as number[] }));

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

  async updateAsset(workspaceId: string, brandId: string, assetId: string, input: unknown) {
    const patch = BrandAssetUpdateInput.parse(input);
    return updateBrandAsset(this.db(), workspaceId, brandId, assetId, {
      ...(patch.variant ? { variant: patch.variant } : {}),
      ...(patch.background ? { background: patch.background } : {}),
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.isPrimary ? { isPrimary: true } : {}),
    });
  }

  async deleteAsset(workspaceId: string, brandId: string, assetId: string) {
    const asset = await deleteBrandAsset(this.db(), workspaceId, brandId, assetId);
    if (!asset) return asset;

    const brand = await getBrand(this.db(), workspaceId, brandId);
    if (asset.isPrimary || brand?.logoS3Key === asset.s3Key) {
      const remaining = await listBrandAssets(this.db(), workspaceId, brandId);
      const nextLogo = remaining.find((candidate) => candidate.kind === "logo");
      if (nextLogo) {
        await updateBrandAsset(this.db(), workspaceId, brandId, nextLogo.id, { isPrimary: true });
      } else {
        await updateBrand(this.db(), workspaceId, brandId, { logoS3Key: null });
      }
    }

    if (asset.s3Key) {
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
