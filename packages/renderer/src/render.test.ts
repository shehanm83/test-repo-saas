import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderTemplate } from "./render.js";

// Minimal valid 1x1 white PNG
const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQ" +
    "AABjkB6QAAAABJRU5ErkJggg==",
  "base64",
);

describe("renderTemplate", () => {
  it("renders a 1080x1080 PNG", async () => {
    const src = readFileSync(
      join(import.meta.dirname, "../test-fixtures/template-square.tsx.txt"),
      "utf8",
    );
    const r = await renderTemplate({
      templateJsxSource: src,
      background: { bytes: MINIMAL_PNG, mimeType: "image/png" },
      brand: {
        palette: { primary: "#ffffff" },
        fonts: {
          heading: { family: "Inter", weight: "700" },
          body: { family: "Inter", weight: "400" },
        },
        flags: { useColors: true, useLogo: false, useFonts: true },
      },
      slots: { headline: "Christmas Sale 30% Off" },
      output: { width: 1080, height: 1080 },
    });
    expect(r.pngBytes.byteLength).toBeGreaterThan(1000);
    expect(r.renderMs).toBeGreaterThan(0);
  }, 30000);

  it("renders a 1920x1080 landscape PNG", async () => {
    const src = readFileSync(
      join(import.meta.dirname, "../test-fixtures/template-square.tsx.txt"),
      "utf8",
    );
    const r = await renderTemplate({
      templateJsxSource: src,
      background: { bytes: MINIMAL_PNG, mimeType: "image/png" },
      brand: {
        palette: { primary: "#000000" },
        fonts: {
          heading: { family: "Roboto", weight: "700" },
          body: { family: "Roboto", weight: "400" },
        },
        flags: { useColors: true, useLogo: false, useFonts: true },
      },
      slots: { headline: "Wide Banner" },
      output: { width: 1920, height: 1080 },
    });
    expect(r.pngBytes.byteLength).toBeGreaterThan(1000);
  }, 30000);
});
