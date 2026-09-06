import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDb,
  insertLandingHeroSet,
  listLandingHeroSetsAll,
  updateLandingHeroSet,
  upsertLandingHeroSetCard,
} from "@layertone/db";
import { createAdapters } from "@layertone/shared/adapters";
import { loadConfig } from "@layertone/shared/config";

type LandingHeroStatus = "draft" | "published" | "archived";
type TextPosition = "top" | "bottom";
type TextColor = "white" | "dark";

interface PredefinedCard {
  slot: number;
  asset?: string;
  imageUrl?: string;
  headline: string;
  sub: string;
  textPosition: TextPosition;
  textColor: TextColor;
  brandInitials: string;
  brandColor: string;
  brandTextColor: string;
  badgeText?: string | null;
  badgeBg?: string | null;
  badgeColor?: string | null;
}

interface PredefinedSet {
  name: string;
  previousNames: string[];
  status: LandingHeroStatus;
  weight: number;
  config: Record<string, unknown>;
  cards: PredefinedCard[];
}

interface PredefinedSetWithFolder {
  folder: string;
  dir: string;
  set: PredefinedSet;
}

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const statusValues = new Set(["draft", "published", "archived"]);
const textPositionValues = new Set(["top", "bottom"]);
const textColorValues = new Set(["white", "dark"]);
const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function asOptionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  return asString(value, field);
}

function parseCard(input: unknown, folder: string): PredefinedCard {
  if (!isRecord(input)) throw new Error(`${folder}: card must be an object`);

  const slot = input.slot;
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > 4) {
    throw new Error(`${folder}: card slot must be 1, 2, 3, or 4`);
  }

  const asset = asOptionalString(input.asset, `${folder}: card ${slot} asset`);
  const imageUrl = asOptionalString(input.imageUrl, `${folder}: card ${slot} imageUrl`);
  if (!asset && !imageUrl) {
    throw new Error(`${folder}: card ${slot} needs either asset or imageUrl`);
  }
  if (asset && imageUrl) {
    throw new Error(`${folder}: card ${slot} cannot define both asset and imageUrl`);
  }

  const textPosition = asString(
    input.textPosition,
    `${folder}: card ${slot} textPosition`,
  ) as TextPosition;
  if (!textPositionValues.has(textPosition)) {
    throw new Error(`${folder}: card ${slot} textPosition must be top or bottom`);
  }

  const textColor = asString(input.textColor, `${folder}: card ${slot} textColor`) as TextColor;
  if (!textColorValues.has(textColor)) {
    throw new Error(`${folder}: card ${slot} textColor must be white or dark`);
  }

  return {
    slot,
    ...(asset ? { asset } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    headline: asString(input.headline, `${folder}: card ${slot} headline`),
    sub: asString(input.sub, `${folder}: card ${slot} sub`),
    textPosition,
    textColor,
    brandInitials: asString(input.brandInitials, `${folder}: card ${slot} brandInitials`),
    brandColor: asString(input.brandColor, `${folder}: card ${slot} brandColor`),
    brandTextColor: asString(input.brandTextColor, `${folder}: card ${slot} brandTextColor`),
    badgeText: asOptionalString(input.badgeText, `${folder}: card ${slot} badgeText`),
    badgeBg: asOptionalString(input.badgeBg, `${folder}: card ${slot} badgeBg`),
    badgeColor: asOptionalString(input.badgeColor, `${folder}: card ${slot} badgeColor`),
  };
}

function parseSet(input: unknown, folder: string): PredefinedSet {
  if (!isRecord(input)) throw new Error(`${folder}: set.json must contain an object`);

  const status = asString(input.status, `${folder}: status`) as LandingHeroStatus;
  if (!statusValues.has(status)) {
    throw new Error(`${folder}: status must be draft, published, or archived`);
  }

  if (typeof input.weight !== "number" || !Number.isInteger(input.weight) || input.weight < 1) {
    throw new Error(`${folder}: weight must be a positive integer`);
  }
  if (!isRecord(input.config)) throw new Error(`${folder}: config must be an object`);
  if (!Array.isArray(input.cards) || input.cards.length !== 4) {
    throw new Error(`${folder}: cards must contain exactly four cards`);
  }

  const cards = input.cards.map((card) => parseCard(card, folder));
  const slots = new Set(cards.map((card) => card.slot));
  if (slots.size !== 4 || ![1, 2, 3, 4].every((slot) => slots.has(slot))) {
    throw new Error(`${folder}: cards must include slots 1, 2, 3, and 4`);
  }

  return {
    name: asString(input.name, `${folder}: name`),
    previousNames: Array.isArray(input.previousNames)
      ? input.previousNames.map((name, index) =>
          asString(name, `${folder}: previousNames[${index}]`),
        )
      : [],
    status,
    weight: input.weight,
    config: input.config,
    cards,
  };
}

async function loadPredefinedSets(): Promise<PredefinedSetWithFolder[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const sets: PredefinedSetWithFolder[] = [];
  for (const folder of folders) {
    const dir = path.join(rootDir, folder);
    const raw = await readFile(path.join(dir, "set.json"), "utf8");
    sets.push({ folder, dir, set: parseSet(JSON.parse(raw), folder) });
  }
  return sets;
}

function assetKey(folder: string, card: PredefinedCard): { key: string; contentType: string } {
  if (!card.asset) throw new Error("assetKey requires a local asset");
  const ext = path.extname(card.asset).slice(1).toLowerCase();
  const contentType = contentTypes[ext];
  if (!contentType) {
    throw new Error(`${folder}: card ${card.slot} asset must be png, jpg, jpeg, or webp`);
  }
  return {
    key: `landing-hero/predefined/${folder}/slot-${card.slot}.${ext}`,
    contentType,
  };
}

async function main() {
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");
  const adapters = createAdapters(config);
  const predefinedSets = await loadPredefinedSets();
  const existingSets = await listLandingHeroSetsAll(db);
  const existingByName = new Map(existingSets.map((set) => [set.name, set]));

  for (const item of predefinedSets) {
    const existing =
      existingByName.get(item.set.name) ??
      item.set.previousNames.map((name) => existingByName.get(name)).find(Boolean);
    const savedSet = existing
      ? await updateLandingHeroSet(db, existing.id, {
          name: item.set.name,
          status: item.set.status,
          weight: item.set.weight,
          config: item.set.config,
        })
      : await insertLandingHeroSet(db, {
          name: item.set.name,
          status: item.set.status,
          weight: item.set.weight,
          config: item.set.config,
        });

    if (!savedSet) throw new Error(`Failed to save ${item.set.name}`);

    for (const card of item.set.cards) {
      let s3Key: string | null = null;
      let imageUrl: string | null = card.imageUrl ?? null;

      if (card.asset) {
        const assetPath = path.join(item.dir, card.asset);
        const bytes = await readFile(assetPath);
        const asset = assetKey(item.folder, card);
        await adapters.storage.putBytes(asset.key, bytes, asset.contentType);
        s3Key = asset.key;
        imageUrl = null;
      }

      await upsertLandingHeroSetCard(db, {
        setId: savedSet.id,
        slot: card.slot,
        s3Key,
        imageUrl,
        headline: card.headline,
        sub: card.sub,
        textPosition: card.textPosition,
        textColor: card.textColor,
        brandInitials: card.brandInitials,
        brandColor: card.brandColor,
        brandTextColor: card.brandTextColor,
        badgeText: card.badgeText ?? null,
        badgeBg: card.badgeBg ?? null,
        badgeColor: card.badgeColor ?? null,
      });
    }

    console.info(
      `${existing ? "Updated" : "Created"} landing hero set "${item.set.name}" (${item.folder})`,
    );
  }
}

main()
  .then(() => {
    console.info("Predefined landing hero upload complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
