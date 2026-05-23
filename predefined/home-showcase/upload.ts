import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDb,
  deleteHomeShowcaseImage,
  listHomeShowcaseImages,
  upsertHomeShowcaseConfig,
  upsertHomeShowcaseImage,
} from "@layertone/db";
import { createAdapters } from "@layertone/shared/adapters";
import { loadConfig } from "@layertone/shared/config";

interface ManifestCard {
  eyebrow: string;
  heading: string;
  body: string;
  color: string;
}

interface ManifestImage {
  id: string;
  asset: string;
  sortOrder: number;
}

interface Manifest {
  config: {
    kicker: string;
    galleryHeading: string;
    differentiatorHeading: string;
    cards: [ManifestCard, ManifestCard, ManifestCard];
  };
  images: ManifestImage[];
}

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function parseManifest(input: unknown): Manifest {
  if (!isRecord(input) || !isRecord(input.config) || !Array.isArray(input.images)) {
    throw new Error("showcase.json must contain config and images");
  }
  const config = input.config;
  const cards = config.cards;
  if (!Array.isArray(cards) || cards.length !== 3) {
    throw new Error("config.cards must contain exactly 3 cards");
  }
  if (input.images.length <= 5) {
    throw new Error("images must contain more than 5 images");
  }

  return {
    config: {
      kicker: asString(config.kicker, "config.kicker"),
      galleryHeading: asString(config.galleryHeading, "config.galleryHeading"),
      differentiatorHeading: asString(config.differentiatorHeading, "config.differentiatorHeading"),
      cards: cards.map((card, index) => {
        if (!isRecord(card)) throw new Error(`config.cards[${index}] must be an object`);
        return {
          eyebrow: asString(card.eyebrow, `config.cards[${index}].eyebrow`),
          heading: asString(card.heading, `config.cards[${index}].heading`),
          body: asString(card.body, `config.cards[${index}].body`),
          color: asString(card.color, `config.cards[${index}].color`),
        };
      }) as [ManifestCard, ManifestCard, ManifestCard],
    },
    images: input.images.map((image, index) => {
      if (!isRecord(image)) throw new Error(`images[${index}] must be an object`);
      const sortOrder = image.sortOrder;
      if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || sortOrder < 0) {
        throw new Error(`images[${index}].sortOrder must be a non-negative integer`);
      }
      return {
        id: asString(image.id, `images[${index}].id`),
        asset: asString(image.asset, `images[${index}].asset`),
        sortOrder,
      };
    }),
  };
}

function storageFor(asset: string) {
  const ext = path.extname(asset).slice(1).toLowerCase();
  const contentType = contentTypes[ext];
  if (!contentType) throw new Error(`${asset} must be png, jpg, jpeg, or webp`);
  return {
    key: `home-showcase/predefined/${path.basename(asset)}`,
    contentType,
  };
}

async function main() {
  const manifest = parseManifest(
    JSON.parse(await readFile(path.join(rootDir, "showcase.json"), "utf8")),
  );
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");
  const adapters = createAdapters(config);

  await upsertHomeShowcaseConfig(db, manifest.config);

  const desiredIds = new Set(manifest.images.map((image) => image.id));
  const existing = await listHomeShowcaseImages(db);
  for (const image of existing) {
    if (!desiredIds.has(image.id)) {
      await deleteHomeShowcaseImage(db, image.id);
      await adapters.storage.delete(image.s3Key).catch(() => undefined);
    }
  }

  for (const image of manifest.images) {
    const asset = storageFor(image.asset);
    await adapters.storage.putBytes(
      asset.key,
      await readFile(path.join(rootDir, image.asset)),
      asset.contentType,
    );
    await upsertHomeShowcaseImage(db, {
      id: image.id,
      s3Key: asset.key,
      sortOrder: image.sortOrder,
    });
  }

  console.info(`Uploaded home showcase with ${manifest.images.length} images`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
