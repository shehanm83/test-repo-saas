import { adminInsertPricebookEntry, createDb } from "../src";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const db = createDb(databaseUrl, "app_admin");
const version = 1;
const effectiveFrom = new Date("2026-04-25T00:00:00Z");
const rows = [
  ["flux-1.1-pro", "standard", false, false, 5],
  ["flux-1.1-pro", "standard", false, true, 7],
  ["flux-1.1-pro", "large", false, false, 8],
  ["flux-1.1-pro", "large", false, true, 10],
  ["gpt-image-1", "standard", true, false, 15],
  ["gpt-image-1", "standard", true, true, 17],
  ["gpt-image-1", "large", true, false, 22],
  ["gpt-image-1", "large", true, true, 24],
  ["recraft-v3", "standard", false, false, 8],
  ["recraft-v3", "standard", false, true, 10],
  ["bedrock-sd35", "standard", false, false, 3],
  ["bedrock-sd35", "standard", false, true, 4],
] as const;

for (const [modelCode, sizeBucket, premiumFlag, hasInspirationFlag, credits] of rows) {
  await adminInsertPricebookEntry(db, {
    modelCode,
    sizeBucket,
    premiumFlag,
    hasInspirationFlag,
    credits,
    version,
    effectiveFrom,
  });
}

console.warn("price book seeded");
