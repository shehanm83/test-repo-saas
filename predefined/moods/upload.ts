import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createDb, moods, sql } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

type MoodKind = "seasonal" | "evergreen";
type MoodStatus = "published";

interface PredefinedMood {
  id: string;
  slug: string;
  name: string;
  kind: MoodKind;
  validFrom: string | null;
  validTo: string | null;
  accentPalette: string[];
  decorationTags: string[];
  promptModifiers: string;
  negativePrompts: string;
  previewAsset: string;
}

interface Manifest {
  version: number;
  supportedAspectRatios: string[];
  moods: PredefinedMood[];
}

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const contentTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
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

function asStringArray(value: unknown, field: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value as string[];
}

function asOptionalDate(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return null;
  const raw = asString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.valueOf())) throw new Error(`${field} must be a valid date`);
  return raw;
}

function parseMood(input: unknown, index: number): PredefinedMood {
  if (!isRecord(input)) throw new Error(`moods[${index}] must be an object`);
  const kind = asString(input.kind, `moods[${index}].kind`) as MoodKind;
  if (kind !== "seasonal" && kind !== "evergreen") {
    throw new Error(`moods[${index}].kind must be seasonal or evergreen`);
  }

  return {
    id: asString(input.id, `moods[${index}].id`),
    slug: asString(input.slug, `moods[${index}].slug`),
    name: asString(input.name, `moods[${index}].name`),
    kind,
    validFrom: asOptionalDate(input.validFrom, `moods[${index}].validFrom`),
    validTo: asOptionalDate(input.validTo, `moods[${index}].validTo`),
    accentPalette: asStringArray(input.accentPalette, `moods[${index}].accentPalette`),
    decorationTags: asStringArray(input.decorationTags, `moods[${index}].decorationTags`),
    promptModifiers: asString(input.promptModifiers, `moods[${index}].promptModifiers`),
    negativePrompts:
      typeof input.negativePrompts === "string"
        ? input.negativePrompts
        : asString(input.negativePrompts, `moods[${index}].negativePrompts`),
    previewAsset: asString(input.previewAsset, `moods[${index}].previewAsset`),
  };
}

function parseManifest(input: unknown): Manifest {
  if (!isRecord(input) || !Array.isArray(input.moods)) {
    throw new Error("catalog.json must contain moods");
  }
  const version = input.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error("version must be a positive integer");
  }

  return {
    version,
    supportedAspectRatios: asStringArray(input.supportedAspectRatios, "supportedAspectRatios"),
    moods: input.moods.map(parseMood),
  };
}

function storageFor(mood: PredefinedMood) {
  const ext = path.extname(mood.previewAsset).slice(1).toLowerCase();
  const contentType = contentTypes[ext];
  if (!contentType) throw new Error(`${mood.slug}: previewAsset must be png, jpg, jpeg, or webp`);
  return {
    key: `moods/${mood.id}/preview.${ext}`,
    contentType,
  };
}

async function ensureBucket(client: S3Client, bucket: string) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

async function main() {
  const manifest = parseManifest(
    JSON.parse(await readFile(path.join(rootDir, "catalog.json"), "utf8")),
  );
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");
  const bucket = config.storage.bucketGlobal;
  const storage = new S3Client({
    region: config.storage.region,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId && config.storage.secretAccessKey
      ? {
          credentials: {
            accessKeyId: config.storage.accessKeyId,
            secretAccessKey: config.storage.secretAccessKey,
          },
        }
      : {}),
  });

  await ensureBucket(storage, bucket);

  const status: MoodStatus = "published";
  for (const mood of manifest.moods) {
    const asset = storageFor(mood);
    await storage.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: asset.key,
        Body: await readFile(path.join(rootDir, mood.previewAsset)),
        ContentType: asset.contentType,
      }),
    );

    await db
      .insert(moods)
      .values({
        id: mood.id,
        slug: mood.slug,
        name: mood.name,
        kind: mood.kind,
        validFrom: mood.validFrom ? new Date(mood.validFrom) : null,
        validTo: mood.validTo ? new Date(mood.validTo) : null,
        promptModifiers: mood.promptModifiers,
        negativePrompts: mood.negativePrompts,
        accentPalette: mood.accentPalette,
        decorationTags: mood.decorationTags,
        supportedAspectRatios: manifest.supportedAspectRatios,
        status,
        previewS3Key: asset.key,
      })
      .onConflictDoUpdate({
        target: moods.slug,
        set: {
          name: mood.name,
          kind: mood.kind,
          validFrom: mood.validFrom ? new Date(mood.validFrom) : null,
          validTo: mood.validTo ? new Date(mood.validTo) : null,
          promptModifiers: mood.promptModifiers,
          negativePrompts: mood.negativePrompts,
          accentPalette: mood.accentPalette,
          decorationTags: mood.decorationTags,
          supportedAspectRatios: manifest.supportedAspectRatios,
          status,
          previewS3Key: asset.key,
          updatedAt: sql`now()`,
        },
      });

    console.info(`Imported mood "${mood.name}" (${mood.slug})`);
  }

  console.info(`Predefined mood import complete: ${manifest.moods.length} moods published`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
