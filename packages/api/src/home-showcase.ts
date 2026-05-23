import { randomUUID } from "node:crypto";

import {
  createDb,
  deleteHomeShowcaseImage,
  getHomeShowcaseConfig,
  insertHomeShowcaseImage,
  listHomeShowcaseImages,
  upsertHomeShowcaseConfig,
} from "@layertone/db";
import type { Adapters, Config } from "@layertone/shared";
import {
  DEFAULT_HOME_SHOWCASE_VIEW,
  type HomeShowcaseConfig,
  type HomeShowcaseImage,
  type HomeShowcaseView,
} from "@layertone/shared/home-showcase";
import { keys } from "@layertone/storage";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;
const HexColor = z.string().regex(/^#[0-9a-f]{3}([0-9a-f]{3})?$/i);

const CardSchema = z.object({
  eyebrow: z.string().min(1).max(40),
  heading: z.string().min(1).max(100),
  body: z.string().min(1).max(240),
  color: HexColor,
});

const ConfigSchema = z.object({
  kicker: z.string().min(1).max(60),
  galleryHeading: z.string().min(1).max(100),
  differentiatorHeading: z.string().min(1).max(140),
  cards: z.tuple([CardSchema, CardSchema, CardSchema]),
}) satisfies z.ZodType<HomeShowcaseConfig>;

export class HomeShowcaseApi {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  private db() {
    return createDb(this.config.db.url, "app_admin");
  }

  async getAdminView(): Promise<HomeShowcaseView> {
    const [configRow, imageRows] = await Promise.all([
      getHomeShowcaseConfig(this.db()),
      listHomeShowcaseImages(this.db()),
    ]);
    const config = configRow
      ? ConfigSchema.parse(configRow.config)
      : DEFAULT_HOME_SHOWCASE_VIEW.config;
    return {
      config,
      images: await this.hydrateImages(imageRows),
    };
  }

  async getHomeView(): Promise<HomeShowcaseView> {
    const view = await this.getAdminView();
    if (view.images.length <= 5) return DEFAULT_HOME_SHOWCASE_VIEW;
    return view;
  }

  async updateConfig(input: unknown): Promise<HomeShowcaseView> {
    const parsed = ConfigSchema.parse(input);
    await upsertHomeShowcaseConfig(this.db(), parsed);
    return this.getAdminView();
  }

  async addImage(input: { bytes: Buffer; filename: string }): Promise<HomeShowcaseView> {
    if (input.bytes.byteLength > MAX_BYTES) {
      throw new Error("file-too-large");
    }
    const sniffed = await fileTypeFromBuffer(input.bytes);
    if (!sniffed || !ALLOWED_IMAGE_MIMES.has(sniffed.mime)) {
      throw new Error("invalid-image-type");
    }

    const { reencodeImage } = await import("./sanitize/image");
    const re = await reencodeImage(input.bytes, {
      format: "png",
      maxLongEdge: 1600,
    });

    const existing = await listHomeShowcaseImages(this.db());
    const imageId = randomUUID();
    const s3Key = keys.homeShowcaseImage(imageId, "png");
    await this.adapters.storage.putBytes(s3Key, re.bytes, re.mimeType);
    await insertHomeShowcaseImage(this.db(), {
      id: imageId,
      s3Key,
      sortOrder: existing.length,
    });
    return this.getAdminView();
  }

  async deleteImage(id: string): Promise<HomeShowcaseView> {
    const existing = await listHomeShowcaseImages(this.db());
    const image = existing.find((row) => row.id === id);
    await deleteHomeShowcaseImage(this.db(), id);
    if (image) {
      await this.adapters.storage.delete(image.s3Key).catch(() => undefined);
    }
    return this.getAdminView();
  }

  pickImagesForRequest(images: HomeShowcaseImage[], count = 5) {
    return [...images].sort(() => Math.random() - 0.5).slice(0, count);
  }

  private async hydrateImages(
    rows: Array<{ id: string; s3Key: string; sortOrder: number }>,
  ): Promise<HomeShowcaseImage[]> {
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        s3Key: row.s3Key,
        sortOrder: row.sortOrder,
        imageUrl: await this.adapters.storage.getSignedUrl(row.s3Key, 3600),
      })),
    );
  }
}
