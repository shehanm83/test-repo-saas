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

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: input.output.width,
    height: input.output.height,
    fonts: [
      {
        name: headingFont.family,
        data: Buffer.from(headingFont.data),
        weight: parseInt(headingWeight, 10) as 400 | 700,
        style: "normal",
      },
      {
        name: bodyFont.family,
        data: Buffer.from(bodyFont.data),
        weight: parseInt(bodyWeight, 10) as 400 | 700,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: input.output.width } });
  const pngBytes = resvg.render().asPng();

  return { pngBytes, renderMs: Date.now() - start };
}

function toDataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}
