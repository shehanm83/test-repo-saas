// One-shot: read images/logo.png, knock out its cream background, write a
// transparent PNG to apps/web/public/brand/logo.png.
//
// Usage:  node scripts/strip-logo-bg.mjs
//
// The script samples the top-left pixel as the background reference, then
// alpha-keys every pixel within a tolerance window. A soft-edge band fades
// alpha smoothly so anti-aliased glyph edges don't get a halo.

import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("/home/shehan/personal/repo/test-repo-saas/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../images/logo.png");
const DST = path.resolve(__dirname, "../apps/web/public/brand/logo.png");

const HARD_TOLERANCE = 26;
const SOFT_TOLERANCE = 60;

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
if (channels !== 4) throw new Error(`expected 4 channels, got ${channels}`);

const bgR = data[0];
const bgG = data[1];
const bgB = data[2];
console.log(`bg sample (top-left): rgb(${bgR}, ${bgG}, ${bgB})`);

let knocked = 0;
let softened = 0;

for (let i = 0; i < data.length; i += 4) {
  const dr = Math.abs(data[i] - bgR);
  const dg = Math.abs(data[i + 1] - bgG);
  const db = Math.abs(data[i + 2] - bgB);
  const dist = Math.max(dr, dg, db);

  if (dist <= HARD_TOLERANCE) {
    data[i + 3] = 0;
    knocked++;
  } else if (dist < SOFT_TOLERANCE) {
    const t = (dist - HARD_TOLERANCE) / (SOFT_TOLERANCE - HARD_TOLERANCE);
    data[i + 3] = Math.round(data[i + 3] * t);
    softened++;
  }
}

console.log(`knocked: ${knocked}px, softened: ${softened}px, total: ${width * height}px`);

// Re-encode to PNG, then trim away the transparent padding so the rendered
// image is tight against the V/Layertone glyphs (no left-air, no top-air).
const trimmed = await sharp(data, { raw: { width, height, channels } })
  .png({ compressionLevel: 9 })
  .trim({ threshold: 1 })
  .toBuffer({ resolveWithObject: true });

await sharp(trimmed.data).toFile(DST);

console.log(
  `trimmed ${width}×${height} → ${trimmed.info.width}×${trimmed.info.height}`,
);
console.log(`wrote ${DST}`);
