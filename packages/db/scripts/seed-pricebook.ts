import { adminInsertPricebookEntry, createDb } from "../src";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const db = createDb(databaseUrl, "app_admin");
const version = 1;
const effectiveFrom = new Date("2026-04-25T00:00:00Z");
// Format: [modelCode, sizeBucket, hasInspirationFlag, credits]
const rows: Array<[string, "standard" | "large", boolean, number]> = [
  // Economy (standard tier default — Flux 1.1 Pro)
  ["economy",       "standard", false, 5],
  ["economy",       "standard", true,  7],
  ["economy",       "large",    false, 8],
  ["economy",       "large",    true,  10],
  // Photoreal Pro (premium · photoreal — Flux 1.1 Pro at premium price)
  ["photoreal-pro", "standard", false, 8],
  ["photoreal-pro", "standard", true,  10],
  ["photoreal-pro", "large",    false, 12],
  ["photoreal-pro", "large",    true,  15],
  // Text Master (premium · text — gpt-image-1)
  ["text-master",   "standard", false, 15],
  ["text-master",   "standard", true,  17],
  ["text-master",   "large",    false, 22],
  ["text-master",   "large",    true,  24],
  // Design Studio (premium · design — Recraft V3)
  ["design-studio", "standard", false, 8],
  ["design-studio", "standard", true,  10],
  ["design-studio", "large",    false, 12],
  ["design-studio", "large",    true,  15],
  // Speed Draft (premium · speed — Bedrock SD3.5)
  ["speed-draft",   "standard", false, 3],
  ["speed-draft",   "standard", true,  4],
  ["speed-draft",   "large",    false, 5],
  ["speed-draft",   "large",    true,  6],
];

for (const [modelCode, sizeBucket, hasInspirationFlag, credits] of rows) {
  await adminInsertPricebookEntry(db, {
    modelCode,
    sizeBucket,
    hasInspirationFlag,
    credits,
    version,
    effectiveFrom,
  });
}

console.warn("price book seeded");
