# Slice 26 — Puppeteer browser-render fallback

**Phase:** 7 — Template renderer
**Depends on:** 25
**Spec references:** [Architecture § 5.3 (Browser-render fallback)](../specs/2026-04-25-studio-v1-architecture.md).

**Definition of done:**
- `renderTemplateBrowser(args)` uses Puppeteer (or `@sparticuz/chromium` for Lambda) to render templates that need CSS features Resvg doesn't support
- Routing rule: if `template.requires_browser_render === true`, dispatch to browser path
- Tests cover a fixture template using `filter: blur(...)` (a feature Resvg drops)

---

## Files

**Create:**
- `packages/renderer/src/browser.ts`
- `packages/renderer/src/browser.test.ts` (skipped by default in CI; runs locally)
- `packages/renderer/test-fixtures/template-blur.html.txt`

**Modify:**
- `packages/renderer/src/index.ts`
- `packages/renderer/package.json`

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @vyora/renderer add puppeteer-core @sparticuz/chromium
```

- [ ] **Step 2 — Browser renderer**

```ts
// packages/renderer/src/browser.ts
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

import type { RenderInput, RenderOutput } from "./types.js";

let cachedBrowser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (cachedBrowser) return cachedBrowser;
  cachedBrowser = await puppeteer.launch({
    args: chromium.args,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? (await chromium.executablePath()),
    headless: true,
    defaultViewport: null,
  });
  return cachedBrowser;
}

export async function renderTemplateBrowser(input: RenderInput): Promise<RenderOutput> {
  const start = Date.now();
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: input.output.width, height: input.output.height, deviceScaleFactor: 1 });

  // Compose a self-contained HTML doc from the template source plus brand/mood/slots
  const html = renderToHtml(input);
  await page.setContent(html, { waitUntil: "networkidle0" });
  const screenshot = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: input.output.width, height: input.output.height } });
  await page.close();

  return { pngBytes: new Uint8Array(screenshot as Buffer), renderMs: Date.now() - start };
}

function renderToHtml(input: RenderInput): string {
  // Templates that opt into browser-render must export a `templateHtml(input)` function returning an HTML string.
  // We invoke it via `new Function` similarly to satori path.
  const factory = new Function("input", `${input.templateJsxSource}; return templateHtml(input);`);
  const body = factory({
    background: { dataUrl: `data:${input.background.mimeType};base64,${Buffer.from(input.background.bytes).toString("base64")}` },
    brand: input.brand, mood: input.mood, slots: input.slots, output: input.output,
  });
  const headingFamily = input.brand.fonts.heading.family;
  const bodyFamily = input.brand.fonts.body.family;
  return `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFamily)}:wght@700&family=${encodeURIComponent(bodyFamily)}:wght@400&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;width:${input.output.width}px;height:${input.output.height}px;overflow:hidden}</style>
</head><body>${body}</body></html>`;
}
```

- [ ] **Step 3 — Index router**

In `packages/renderer/src/index.ts`:

```ts
import { renderTemplate as renderSatori } from "./render.js";
import { renderTemplateBrowser } from "./browser.js";
import type { RenderInput, RenderOutput } from "./types.js";

export * from "./types.js";

export async function render(input: RenderInput, opts: { requiresBrowser?: boolean } = {}): Promise<RenderOutput> {
  return opts.requiresBrowser ? renderTemplateBrowser(input) : renderSatori(input);
}
```

- [ ] **Step 4 — Test (skipped in CI)**

`packages/renderer/src/browser.test.ts`:

```ts
import { describe, expect, it } from "vitest";

const skipInCi = process.env.CI === "true";

describe.skipIf(skipInCi)("Puppeteer renderer", () => {
  it("renders a blurred PNG locally", async () => {
    const { renderTemplateBrowser } = await import("./browser.js");
    const html = `function templateHtml(i){return '<div style="width:'+i.output.width+'px;height:'+i.output.height+'px;background:linear-gradient(red,blue);filter:blur(8px)"></div>';}`;
    const r = await renderTemplateBrowser({
      templateJsxSource: html,
      background: { bytes: new Uint8Array(), mimeType: "image/png" },
      brand: { palette: { primary: "#fff" }, fonts: { heading: { family: "Inter" }, body: { family: "Inter" } }, flags: { useColors: true, useLogo: false, useFonts: true } },
      slots: {}, output: { width: 256, height: 256 },
    });
    expect(r.pngBytes.byteLength).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 5 — Commit**

```bash
git add -A
git commit -m "feat(renderer): Puppeteer browser-render fallback for templates needing CSS features Resvg lacks"
```

---

## Verification

```bash
pnpm --filter @vyora/renderer test            # CI=true skips browser test
CI= pnpm --filter @vyora/renderer test         # local: runs browser test
```

## Commit message

```
feat(renderer): Puppeteer browser-render fallback for templates needing CSS features Resvg lacks
```
