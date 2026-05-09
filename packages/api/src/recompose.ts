import sharp from "sharp";
import { z } from "zod";

import {
  createDb,
  eq,
  generationVariants,
  getVariantWithBackground,
} from "@vyora/db";
import { AppError, CODES } from "@vyora/shared";
import type { Config, StorageAdapter } from "@vyora/shared";

const RecomposeInput = z
  .object({
    crop: z
      .object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        w: z.number().min(0).max(1),
        h: z.number().min(0).max(1),
      })
      .refine((c) => c.x + c.w <= 1.001, { message: "crop_outside_bounds_x" })
      .refine((c) => c.y + c.h <= 1.001, { message: "crop_outside_bounds_y" })
      .refine((c) => c.w > 0 && c.h > 0, { message: "crop_zero_area" }),
    targetWidth: z.number().int().min(256).max(4096),
    targetHeight: z.number().int().min(256).max(4096),
  })
  .strict();

export type RecomposeInputType = z.infer<typeof RecomposeInput>;

export interface RecomposeResult {
  outputS3Key: string;
  signedUrl: string;
  width: number;
  height: number;
  recomposedAt: string;
  cropRegion: { x: number; y: number; w: number; h: number; targetWidth: number; targetHeight: number };
}

export class RecomposeService {
  constructor(
    private readonly config: Config,
    private readonly storage: StorageAdapter,
  ) {}

  private db() {
    return createDb(this.config.db.url, "app_admin");
  }

  async recomposeVariant(args: {
    workspaceId: string;
    generationId: string;
    variantId: string;
    input: unknown;
  }): Promise<RecomposeResult> {
    const parsed = RecomposeInput.safeParse(args.input);
    if (!parsed.success) {
      throw new AppError(
        CODES.VALIDATION_FAILED,
        "invalid_crop_region",
        422,
        { issues: parsed.error.issues },
      );
    }
    const { crop, targetWidth, targetHeight } = parsed.data;

    const v = await getVariantWithBackground(this.db(), args.generationId, args.variantId);
    if (!v) {
      throw new AppError(CODES.GENERATION_VARIANT_NOT_FOUND, "variant_not_found", 404);
    }
    if (v.workspaceId !== args.workspaceId) {
      throw new AppError(CODES.AUTH_INSUFFICIENT_ROLE, "wrong_workspace", 403);
    }
    if (v.status !== "completed") {
      throw new AppError(CODES.VALIDATION_FAILED, "variant_not_completed", 422);
    }
    if (!v.backgroundS3Key) {
      throw new AppError(CODES.VALIDATION_FAILED, "variant_has_no_background", 422);
    }
    if (!v.outputS3Key) {
      // Pre-fanin variants shouldn't have status="completed" without an
      // output_s3_key, but guard the type anyway.
      throw new AppError(CODES.VALIDATION_FAILED, "variant_missing_output", 422);
    }

    const bgBytes = await this.storage.getBytes(v.backgroundS3Key);
    const meta = await sharp(Buffer.from(bgBytes)).metadata();
    if (!meta.width || !meta.height) {
      throw new AppError(CODES.VALIDATION_INVALID_IMAGE, "background_metadata_missing", 500);
    }

    // Aspect parity (1% tolerance) — server is authoritative even if the
    // client got the math slightly wrong. Done in *pixel* space because the
    // normalised crop ratio depends on the source's own aspect.
    const cropPixelAspect = (crop.w * meta.width) / (crop.h * meta.height);
    const targetAspect = targetWidth / targetHeight;
    if (Math.abs(cropPixelAspect - targetAspect) / targetAspect > 0.01) {
      throw new AppError(CODES.VALIDATION_FAILED, "aspect_mismatch", 422, {
        cropPixelAspect,
        targetAspect,
      });
    }

    const px = {
      left: Math.round(crop.x * meta.width),
      top: Math.round(crop.y * meta.height),
      width: Math.max(1, Math.round(crop.w * meta.width)),
      height: Math.max(1, Math.round(crop.h * meta.height)),
    };
    // Clamp to image bounds — Sharp throws "extract_area: bad extract area"
    // if the rounded box hangs off the edge by even a pixel.
    if (px.left + px.width > meta.width) px.width = meta.width - px.left;
    if (px.top + px.height > meta.height) px.height = meta.height - px.top;

    const out = await sharp(Buffer.from(bgBytes))
      .extract(px)
      .resize(targetWidth, targetHeight, { fit: "fill" })
      .png()
      .toBuffer();

    await this.storage.putBytes(v.outputS3Key, out, "image/png");

    const recomposedAt = new Date();
    const cropRegion = { ...crop, targetWidth, targetHeight };
    await this.db()
      .update(generationVariants)
      .set({ recomposedAt, cropRegion })
      .where(eq(generationVariants.id, args.variantId));

    const signedUrl = await this.storage.getSignedUrl(v.outputS3Key, 60 * 60);
    return {
      outputS3Key: v.outputS3Key,
      signedUrl,
      width: targetWidth,
      height: targetHeight,
      recomposedAt: recomposedAt.toISOString(),
      cropRegion,
    };
  }
}
