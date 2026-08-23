import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import QRCode from "qrcode";
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
  const start = performance.now();
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({
    width: input.output.width,
    height: input.output.height,
    deviceScaleFactor: 1,
  });

  const html = await renderToHtml(input);
  await page.setContent(html, { waitUntil: "networkidle0" });
  const screenshot = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: input.output.width, height: input.output.height },
  });
  await page.close();

  return {
    pngBytes: new Uint8Array(screenshot as Buffer),
    renderMs: Math.max(1, Math.round(performance.now() - start)),
  };
}

async function renderToHtml(input: RenderInput): Promise<string> {
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
</head><body>${body}${await exactOverlayHtml(input)}</body></html>`;
}

async function exactOverlayHtml(input: RenderInput) {
  const s = input.slots;
  const values = [
    s.badgeText,
    s.headline,
    s.subtitle ?? s.subhead,
    s.price,
    s.discount,
    s.cta,
    s.offerExpiry,
    s.website,
    s.phone,
    s.legalText,
  ].filter(Boolean);
  const certs = input.exactOverlay?.certificationAssets ?? [];
  const logo = exactLogoDataUrl(input);
  const qr = s.qrUrl
    ? await QRCode.toDataURL(s.qrUrl, { errorCorrectionLevel: "M", margin: 1, width: 256 })
    : null;
  if (!values.length && !certs.length && !qr && !logo) return "";
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const copy = values
    .map(
      (value, index) =>
        `<div style="${index === 1 ? "font-size:46px;font-weight:700" : "font-size:20px"}">${escape(String(value))}</div>`,
    )
    .join("");
  const images =
    certs
      .map(
        (asset) =>
          `<img alt="certification" src="data:${asset.mimeType};base64,${Buffer.from(asset.bytes).toString("base64")}"/>`,
      )
      .join("") + (qr ? `<img alt="QR code" src="${qr}"/>` : "");
  return `<div style="position:absolute;inset:0;pointer-events:none">${logo ? `<img alt="Brand logo" src="${logo}" style="position:absolute;left:36px;top:36px;width:160px;height:84px;object-fit:contain;object-position:left center"/>` : ""}${values.length ? `<div style="position:absolute;left:48px;bottom:48px;max-width:64%;padding:20px 24px;color:#fff;background:rgba(0,0,0,.62);border-radius:14px;font-family:${escape(input.brand.fonts.body.family)};display:flex;flex-direction:column;gap:8px">${copy}</div>` : ""}<div class="exact-assets" style="position:absolute;right:36px;bottom:36px;display:flex;gap:12px;align-items:flex-end">${images}</div></div><style>.exact-assets img{width:108px;height:108px;object-fit:contain;background:#fff;padding:5px}</style>`;
}

function exactLogoDataUrl(input: RenderInput) {
  if (!input.brand.flags.useLogo) return null;
  if (input.brand.logoSvg) {
    return `data:image/svg+xml;base64,${Buffer.from(input.brand.logoSvg).toString("base64")}`;
  }
  if (input.brand.logoPng) {
    return `data:image/png;base64,${Buffer.from(input.brand.logoPng.bytes).toString("base64")}`;
  }
  return null;
}
