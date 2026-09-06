import { mkdtempSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cacheDir = (() => {
  try { return mkdtempSync(join(tmpdir(), "layertone-fonts-")); } catch { return "/tmp"; }
})();

interface FontEntry { family: string; weight: string; data: Uint8Array }
const cache = new Map<string, FontEntry>();

export async function loadGoogleFont(family: string, weight = "500"): Promise<FontEntry> {
  const key = `${family}-${weight}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const filePath = join(cacheDir, `${key.replace(/\s+/g, "_")}.ttf`);
  if (existsSync(filePath)) {
    const data = new Uint8Array(readFileSync(filePath));
    const e = { family, weight, data };
    cache.set(key, e);
    return e;
  }

  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  const css = await cssRes.text();
  const url = css.match(/url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error(`font-not-found:${family}:${weight}`);
  const fontRes = await fetch(url);
  const buf = new Uint8Array(await fontRes.arrayBuffer());
  writeFileSync(filePath, buf);
  const e = { family, weight, data: buf };
  cache.set(key, e);
  return e;
}
