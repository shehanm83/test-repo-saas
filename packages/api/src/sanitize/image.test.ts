import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { reencodeImage } from "./image";

describe("reencodeImage", () => {
  it("downscales above max long edge", async () => {
    const big = await sharp({
      create: { width: 4000, height: 2000, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();

    const out = await reencodeImage(big, { maxLongEdge: 2048 });

    expect(out.width).toBe(2048);
    expect(out.height).toBe(1024);
  });

  it("preserves smaller images", async () => {
    const small = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#000" },
    })
      .png()
      .toBuffer();

    const out = await reencodeImage(small, { maxLongEdge: 2048 });

    expect(out.width).toBe(800);
    expect(out.height).toBe(600);
  });
});
