import { randomUUID } from "node:crypto";

import {
  createDb,
  deleteLandingHeroCard,
  insertLandingHeroCard,
  listLandingHeroCardsAll,
  listLandingHeroCardsPublished,
  updateLandingHeroCard,
} from "@layertone/db";
import type { Adapters, Config } from "@layertone/shared";
import { keys } from "@layertone/storage";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

const HeroFields = z.object({
  headline: z.string().min(1).max(200),
  sub: z.string().max(200).default(""),
  textPosition: z.enum(["top", "bottom"]).default("bottom"),
  textColor: z.enum(["white", "dark"]).default("white"),
  brandInitials: z.string().min(1).max(8).default("NW"),
  brandColor: z.string().min(1).max(32).default("#FFFFFF"),
  brandTextColor: z.string().min(1).max(32).default("#2A1F18"),
  badgeText: z.string().max(40).nullable().optional(),
  badgeBg: z.string().max(32).nullable().optional(),
  badgeColor: z.string().max(32).nullable().optional(),
  rotation: z.number().int().min(-10).max(10).default(0),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  status: z.enum(["draft", "published"]).default("draft"),
});

const UpdateInput = HeroFields.partial();

export class LandingHeroApi {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  private db() {
    return createDb(this.config.db.url, "app_admin");
  }

  async listAll() {
    return listLandingHeroCardsAll(this.db());
  }

  async listPublished() {
    return listLandingHeroCardsPublished(this.db());
  }

  async create(input: {
    fields: unknown;
    file: { bytes: Buffer; filename: string };
  }) {
    if (input.file.bytes.byteLength > MAX_BYTES) {
      throw new Error("file-too-large");
    }
    const sniffed = await fileTypeFromBuffer(input.file.bytes);
    if (!sniffed || !ALLOWED_IMAGE_MIMES.has(sniffed.mime)) {
      throw new Error("invalid-image-type");
    }

    const { reencodeImage } = await import("./sanitize/image");
    const re = await reencodeImage(input.file.bytes, {
      format: "png",
      maxLongEdge: 1600,
    });

    const fields = HeroFields.parse(input.fields);
    const cardId = randomUUID();
    const s3Key = keys.landingHero(cardId, "png");
    await this.adapters.storage.putBytes(s3Key, re.bytes, re.mimeType);

    return insertLandingHeroCard(this.db(), {
      id: cardId,
      s3Key,
      ...fields,
    });
  }

  async update(id: string, input: unknown) {
    const parsed = UpdateInput.parse(input);
    const patch = Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => v !== undefined),
    );
    return updateLandingHeroCard(this.db(), id, patch);
  }

  async delete(id: string) {
    await deleteLandingHeroCard(this.db(), id);
  }

  async signedImageUrl(s3Key: string, ttlSec = 3600) {
    return this.adapters.storage.getSignedUrl(s3Key, ttlSec);
  }
}
