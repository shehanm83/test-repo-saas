# Slice 25 — Satori-based template renderer

**Phase:** 7 — Template renderer
**Depends on:** 13, 17
**Spec references:** [Architecture § 5 (Template renderer)](../specs/2026-04-25-studio-v1-architecture.md), [Spec § 3.4 step 8 (renderer call)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `@studio/renderer` package exposes `renderTemplate(args)` returning `{ pngBytes, renderMs }`
- Loads template JSX source from DB and compiles in a sandboxed Function — input is the template's `jsx_source` text string with a known parameter shape: `({ background, brand, mood, slots, output }) => SatoriElement`
- Loads brand fonts from `@studio/storage` (cached in `/tmp` for warm starts)
- Renders via Satori → SVG → Resvg → PNG at exact pixel dimensions per `output.width × output.height`
- Tests cover small/large/tall/wide aspect ratios with a fixture template

---

## Files

**Create:**
- `packages/renderer/src/{render.ts,fonts.ts,sandbox.ts,render.test.ts}`
- `packages/renderer/test-fixtures/template-square.tsx.txt`
- `packages/renderer/src/types.ts`

**Modify:**
- `packages/renderer/package.json`

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @studio/renderer add satori @resvg/resvg-js
pnpm --filter @studio/renderer add @studio/shared@workspace:*
```

- [ ] **Step 2 — Types**

`packages/renderer/src/types.ts`:

```ts
export interface RenderInput {
  templateJsxSource: string;
  background: { bytes: Uint8Array; mimeType: string };
  brand: {
    logoSvg?: string;
    logoPng?: { bytes: Uint8Array; width: number; height: number };
    palette: { primary: string; secondary?: string; accent?: string; extras?: string[] };
    fonts: { heading: { family: string; weight?: string }; body: { family: string; weight?: string } };
    flags: { useColors: boolean; useLogo: boolean; useFonts: boolean };
  };
  mood?: {
    accentPalette: string[];
    decorationTags: string[];
    typographyHint?: { weight?: string; justification?: string };
    flags: { useDecorations: boolean; useAccentColors: boolean };
  };
  slots: { headline?: string; subhead?: string; cta?: string };
  decorationStockUrls?: string[];
  output: { width: number; height: number };
}

export interface RenderOutput {
  pngBytes: Uint8Array;
  renderMs: number;
}
```

- [ ] **Step 3 — Font cache**

`packages/renderer/src/fonts.ts`:

```ts
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cacheDir = (() => {
  try { return mkdtempSync(join(tmpdir(), "studio-fonts-")); } catch { return "/tmp"; }
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
```

- [ ] **Step 4 — Sandbox**

`packages/renderer/src/sandbox.ts`:

```ts
/**
 * Compile a template JSX source string into a function that takes input and returns a Satori-compatible React element.
 * Templates are admin-authored, so `new Function` is acceptable. We require the source to expose a `default` template function via `module.exports.default`.
 */
import * as React from "react";

export type TemplateFn = (input: unknown) => unknown;

export function compileTemplate(source: string): TemplateFn {
  // The source uses a function declaration — we wrap it so it has `React` and helpers in scope.
  const factory = new Function(
    "React", "h",
    `${source};\nreturn typeof template === 'function' ? template : (typeof module !== 'undefined' && module.exports && module.exports.default) || null;`,
  );
  const fn = factory(React, React.createElement);
  if (typeof fn !== "function") throw new Error("template-source-must-export-template-function");
  return fn as TemplateFn;
}
```

> Templates author functions named `template(input)` returning JSX/React elements built with `h()` (createElement alias).

- [ ] **Step 5 — Renderer**

`packages/renderer/src/render.ts`:

```ts
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { compileTemplate } from "./sandbox.js";
import { loadGoogleFont } from "./fonts.js";
import type { RenderInput, RenderOutput } from "./types.js";

export async function renderTemplate(input: RenderInput): Promise<RenderOutput> {
  const start = Date.now();

  const template = compileTemplate(input.templateJsxSource);
  const tree = template({
    background: { dataUrl: toDataUrl(input.background.bytes, input.background.mimeType) },
    brand: input.brand,
    mood: input.mood,
    slots: input.slots,
    decorations: input.decorationStockUrls ?? [],
    output: input.output,
  });

  const headingWeight = input.brand.fonts.heading.weight ?? "700";
  const bodyWeight = input.brand.fonts.body.weight ?? "400";
  const [headingFont, bodyFont] = await Promise.all([
    loadGoogleFont(input.brand.fonts.heading.family, headingWeight),
    loadGoogleFont(input.brand.fonts.body.family, bodyWeight),
  ]);

  const svg = await satori(tree as never, {
    width: input.output.width,
    height: input.output.height,
    fonts: [
      { name: headingFont.family, data: headingFont.data, weight: parseInt(headingWeight, 10) as 400 | 700, style: "normal" },
      { name: bodyFont.family, data: bodyFont.data, weight: parseInt(bodyWeight, 10) as 400 | 700, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: input.output.width } });
  const pngBytes = resvg.render().asPng();

  return { pngBytes, renderMs: Date.now() - start };
}

function toDataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}
```

- [ ] **Step 6 — Fixture template + test**

`packages/renderer/test-fixtures/template-square.tsx.txt`:

```js
function template({ background, brand, slots, output }) {
  return h(
    "div",
    { style: { display: "flex", width: output.width, height: output.height, backgroundImage: `url(${background.dataUrl})`, backgroundSize: "cover", color: brand.palette.primary, fontFamily: brand.fonts.heading.family } },
    h("div", { style: { padding: 40, fontSize: 64, fontWeight: 700 } }, slots.headline ?? "")
  );
}
```

`packages/renderer/src/render.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderTemplate } from "./render.js";

describe("renderTemplate", () => {
  it("renders a 1080x1080 PNG", async () => {
    const src = readFileSync("test-fixtures/template-square.tsx.txt", "utf8");
    const r = await renderTemplate({
      templateJsxSource: src,
      background: { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), mimeType: "image/png" },
      brand: {
        palette: { primary: "#ffffff" },
        fonts: { heading: { family: "Inter", weight: "700" }, body: { family: "Inter", weight: "400" } },
        flags: { useColors: true, useLogo: true, useFonts: true },
      },
      slots: { headline: "Christmas Sale 30% Off" },
      output: { width: 1080, height: 1080 },
    });
    expect(r.pngBytes.byteLength).toBeGreaterThan(1000);
    expect(r.renderMs).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 7 — Index**

```ts
// packages/renderer/src/index.ts
export * from "./render.js";
export * from "./types.js";
```

- [ ] **Step 8 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(renderer): Satori + Resvg template renderer with brand-font cache"
```

---

## Verification

```bash
pnpm --filter @studio/renderer test
```

## Commit message

```
feat(renderer): Satori + Resvg template renderer with brand-font cache
```
