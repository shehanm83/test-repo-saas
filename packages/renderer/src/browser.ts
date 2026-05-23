import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import type { RenderInput, RenderOutput } from "./types";

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
  await page.setViewport({
    width: input.output.width,
    height: input.output.height,
    deviceScaleFactor: 1,
  });

  const html = renderToHtml(input);
  await page.setContent(html, { waitUntil: "networkidle0" });
  const screenshot = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: input.output.width, height: input.output.height },
  });
  await page.close();

  return { pngBytes: new Uint8Array(screenshot as Buffer), renderMs: Date.now() - start };
}

function renderToHtml(input: RenderInput): string {
  const factory = new Function("input", `${input.templateJsxSource}; return templateHtml(input);`);
  const body = factory({
    background: {
      dataUrl: `data:${input.background.mimeType};base64,${Buffer.from(input.background.bytes).toString("base64")}`,
    },
    brand: input.brand,
    mood: input.mood,
    slots: input.slots,
    output: input.output,
  }) as string;

  const headingFamily = input.brand.fonts.heading.family;
  const bodyFamily = input.brand.fonts.body.family;
  return `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFamily)}:wght@700&family=${encodeURIComponent(bodyFamily)}:wght@400&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;width:${input.output.width}px;height:${input.output.height}px;overflow:hidden}</style>
</head><body>${body}</body></html>`;
}
