import { randomUUID } from "node:crypto";

import {
  createDb,
  deleteLandingHeroCard,
  deleteLandingHeroSet,
  getLandingHeroSet,
  insertLandingHeroCard,
  insertLandingHeroSet,
  listLandingHeroSetCardsBySetIds,
  listLandingHeroCardsAll,
  listLandingHeroCardsPublished,
  listLandingHeroSetsAll,
  listLandingHeroSetsPublished,
  updateLandingHeroCard,
  updateLandingHeroSet,
  upsertLandingHeroSetCard,
} from "@layertone/db";
import type { Adapters, Config } from "@layertone/shared";
import {
  DEFAULT_LANDING_HERO_CARDS,
  DEFAULT_LANDING_HERO_CONFIG,
  type LandingHeroSetCard,
  type LandingHeroSetConfig,
  type LandingHeroSetView,
} from "@layertone/shared/landing-hero";
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

const HexColor = z.string().regex(/^#[0-9a-f]{3}([0-9a-f]{3})?$/i);
const RelativeHref = z.string().refine((value) => value.startsWith("/") || value.startsWith("#"), {
  message: "href must be relative or an anchor",
});

const HeroSetConfigSchema = z.object({
  headline: z.object({
    line1: z.string().min(1).max(80),
    line2Prefix: z.string().min(1).max(30),
    line2Middle: z.string().min(1).max(30),
    line2Suffix: z.string().min(1).max(60),
  }),
  lede: z.string().min(1).max(260),
  primaryCta: z.object({
    label: z.string().min(1).max(40),
    href: RelativeHref,
  }),
  secondaryCta: z.object({
    label: z.string().min(1).max(60),
    href: RelativeHref,
    enabled: z.boolean(),
  }),
  proofItems: z.array(z.string().min(1).max(60)).min(0).max(4),
  prompt: z.object({
    brief: z.string().min(1).max(180),
    brandName: z.string().min(1).max(60),
    brandInitials: z.string().min(1).max(8),
    swatches: z.array(HexColor).min(1).max(6),
    moodName: z.string().min(1).max(40),
  }),
  trust: z.object({
    label: z.string().min(1).max(80),
    teams: z
      .array(
        z.object({
          name: z.string().min(1).max(24),
          color: HexColor,
        }),
      )
      .min(0)
      .max(8),
  }),
}) satisfies z.ZodType<LandingHeroSetConfig>;

const HeroSetInput = z.object({
  name: z.string().min(1).max(80),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  weight: z.number().int().min(1).max(100).default(1),
  config: HeroSetConfigSchema,
});

const HeroSetPatch = HeroSetInput.partial();

const HeroSetCardFields = z.object({
  headline: z.string().min(1).max(200),
  sub: z.string().max(200).default(""),
  textPosition: z.enum(["top", "bottom"]).default("bottom"),
  textColor: z.enum(["white", "dark"]).default("white"),
  brandInitials: z.string().min(1).max(8).default("NW"),
  brandColor: HexColor.default("#FFFFFF"),
  brandTextColor: HexColor.default("#2A1F18"),
  badgeText: z.string().max(40).nullable().optional(),
  badgeBg: HexColor.nullable().optional(),
  badgeColor: HexColor.nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

function cardFallback(slot: number): LandingHeroSetCard {
  return DEFAULT_LANDING_HERO_CARDS[slot - 1] ?? DEFAULT_LANDING_HERO_CARDS[0]!;
}

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

  async create(input: { fields: unknown; file: { bytes: Buffer; filename: string } }) {
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
    const patch = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined));
    return updateLandingHeroCard(this.db(), id, patch);
  }

  async delete(id: string) {
    await deleteLandingHeroCard(this.db(), id);
  }

  async signedImageUrl(s3Key: string, ttlSec = 3600) {
    return this.adapters.storage.getSignedUrl(s3Key, ttlSec);
  }

  async listSets() {
    const sets = await listLandingHeroSetsAll(this.db());
    return this.hydrateSets(sets);
  }

  async listPublishedSets() {
    const sets = await listLandingHeroSetsPublished(this.db());
    return this.hydrateSets(sets);
  }

  async getSet(id: string) {
    const row = await getLandingHeroSet(this.db(), id);
    if (!row) return null;
    const [view] = await this.hydrateSets([row]);
    return view ?? null;
  }

  async createSet(input: unknown = {}) {
    const parsed = z
      .object({
        name: z.string().min(1).max(80).default("New spotlight set"),
        status: z.enum(["draft", "published", "archived"]).default("draft"),
        weight: z.number().int().min(1).max(100).default(1),
        config: HeroSetConfigSchema.default(DEFAULT_LANDING_HERO_CONFIG),
      })
      .parse(input);
    const set = await insertLandingHeroSet(this.db(), parsed);

    for (const card of DEFAULT_LANDING_HERO_CARDS) {
      await upsertLandingHeroSetCard(this.db(), {
        setId: set.id,
        slot: card.slot,
        imageUrl: card.imageUrl,
        headline: card.headline,
        sub: card.sub,
        textPosition: card.textPosition,
        textColor: card.textColor,
        brandInitials: card.brandInitials,
        brandColor: card.brandColor,
        brandTextColor: card.brandTextColor,
        badgeText: card.badgeText,
        badgeBg: card.badgeBg,
        badgeColor: card.badgeColor,
      });
    }

    return this.getSet(set.id);
  }

  async duplicateSet(id: string) {
    const original = await this.getSet(id);
    if (!original) throw new Error("not-found");
    const copy = await insertLandingHeroSet(this.db(), {
      name: `${original.name} copy`,
      status: "draft",
      weight: original.weight,
      config: original.config,
    });
    for (const card of original.cards) {
      await upsertLandingHeroSetCard(this.db(), {
        setId: copy.id,
        slot: card.slot,
        s3Key: card.s3Key,
        imageUrl: card.s3Key ? null : card.imageUrl,
        headline: card.headline,
        sub: card.sub,
        textPosition: card.textPosition,
        textColor: card.textColor,
        brandInitials: card.brandInitials,
        brandColor: card.brandColor,
        brandTextColor: card.brandTextColor,
        badgeText: card.badgeText,
        badgeBg: card.badgeBg,
        badgeColor: card.badgeColor,
      });
    }
    return this.getSet(copy.id);
  }

  async updateSet(id: string, input: unknown) {
    const parsed = HeroSetPatch.parse(input);
    const patch = Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value !== undefined),
    );
    return updateLandingHeroSet(this.db(), id, patch);
  }

  async deleteSet(id: string) {
    await deleteLandingHeroSet(this.db(), id);
  }

  async updateSetCard(
    setId: string,
    slot: number,
    input: {
      fields: unknown;
      file?: { bytes: Buffer; filename: string } | null;
    },
  ) {
    if (slot < 1 || slot > 4) throw new Error("invalid-slot");
    const fields = HeroSetCardFields.parse(input.fields);
    let s3Key: string | null | undefined;
    let imageUrl = fields.imageUrl ?? null;

    if (input.file) {
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
      s3Key = keys.landingHero(`${setId}-${slot}-${randomUUID()}`, "png");
      await this.adapters.storage.putBytes(s3Key, re.bytes, re.mimeType);
      imageUrl = null;
    }

    if (!s3Key && !imageUrl) {
      const fallback = cardFallback(slot);
      imageUrl = fallback.imageUrl;
    }

    await upsertLandingHeroSetCard(this.db(), {
      setId,
      slot,
      s3Key,
      imageUrl,
      headline: fields.headline,
      sub: fields.sub,
      textPosition: fields.textPosition,
      textColor: fields.textColor,
      brandInitials: fields.brandInitials,
      brandColor: fields.brandColor,
      brandTextColor: fields.brandTextColor,
      badgeText: fields.badgeText || null,
      badgeBg: fields.badgeBg || null,
      badgeColor: fields.badgeColor || null,
    });
    return this.getSet(setId);
  }

  pickSetForRequest(sets: LandingHeroSetView[], seed = Math.random()) {
    if (sets.length === 0) return null;
    const totalWeight = sets.reduce((sum, set) => sum + Math.max(1, set.weight), 0);
    let cursor = seed * totalWeight;
    for (const set of sets) {
      cursor -= Math.max(1, set.weight);
      if (cursor <= 0) return set;
    }
    return sets[sets.length - 1]!;
  }

  private async hydrateSets(
    sets: Array<{
      id: string;
      name: string;
      status: "draft" | "published" | "archived";
      weight: number;
      config: LandingHeroSetConfig;
    }>,
  ): Promise<LandingHeroSetView[]> {
    const cards = await listLandingHeroSetCardsBySetIds(
      this.db(),
      sets.map((set) => set.id),
    );
    const cardsBySet = new Map<string, typeof cards>();
    for (const card of cards) {
      const existing = cardsBySet.get(card.setId) ?? [];
      existing.push(card);
      cardsBySet.set(card.setId, existing);
    }

    return Promise.all(
      sets.map(async (set) => ({
        id: set.id,
        name: set.name,
        status: set.status,
        weight: set.weight,
        config: HeroSetConfigSchema.parse(set.config),
        cards: await Promise.all(
          [1, 2, 3, 4].map(async (slot) => {
            const card = cardsBySet.get(set.id)?.find((c) => c.slot === slot);
            const fallback = cardFallback(slot);
            if (!card) return fallback;
            const imageUrl = card.s3Key
              ? await this.signedImageUrl(card.s3Key, 3600)
              : card.imageUrl || fallback.imageUrl;
            return {
              id: card.id,
              slot,
              imageUrl,
              s3Key: card.s3Key,
              headline: card.headline,
              sub: card.sub,
              textPosition: card.textPosition,
              textColor: card.textColor,
              brandInitials: card.brandInitials,
              brandColor: card.brandColor,
              brandTextColor: card.brandTextColor,
              badgeText: card.badgeText,
              badgeBg: card.badgeBg,
              badgeColor: card.badgeColor,
            };
          }),
        ),
      })),
    );
  }
}
