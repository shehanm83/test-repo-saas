import { describe, it, expect } from "vitest";

const skipInCi = process.env.CI === "true";

describe.skipIf(skipInCi)("Puppeteer renderer", () => {
  it("renders a blurred PNG locally", async () => {
    const { renderTemplateBrowser } = await import("./browser.js");
    const html = `function templateHtml(i){return '<div style="width:'+i.output.width+'px;height:'+i.output.height+'px;background:linear-gradient(red,blue);filter:blur(8px)"></div>';}`;
    const r = await renderTemplateBrowser({
      templateJsxSource: html,
      background: { bytes: new Uint8Array(), mimeType: "image/png" },
      brand: {
        palette: { primary: "#fff" },
        fonts: { heading: { family: "Inter" }, body: { family: "Inter" } },
        flags: { useColors: true, useLogo: false, useFonts: true },
      },
      slots: {},
      output: { width: 256, height: 256 },
    });
    expect(r.pngBytes.byteLength).toBeGreaterThan(1000);
  }, 30000);
});
