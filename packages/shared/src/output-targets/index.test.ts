import { describe, expect, it } from "vitest";
import { PLATFORM_FORMATS, resolveOutputTarget, InvalidOutputTargetError } from "./index.js";

describe("resolveOutputTarget", () => {
  it("resolves all platform formats", () => {
    for (const p of PLATFORM_FORMATS) {
      const r = resolveOutputTarget({ kind: "social", platform: p.platform, format: p.format });
      expect(r.width).toBe(p.width);
      expect(r.height).toBe(p.height);
      expect(r.aspectRatio).toBe(p.aspectRatio);
    }
  });

  it("rejects unknown platform/format", () => {
    expect(() =>
      resolveOutputTarget({ kind: "social", platform: "weibo", format: "post" }),
    ).toThrow(InvalidOutputTargetError);
  });

  it("resolves Just-an-image 1:1", () => {
    const r = resolveOutputTarget({ kind: "image", aspectRatio: "1:1" });
    expect(r.width).toBe(1024);
    expect(r.height).toBe(1024);
    expect(r.platform).toBeNull();
  });

  it("rejects unsupported aspect-ratio in image mode", () => {
    expect(() =>
      resolveOutputTarget({ kind: "image", aspectRatio: "1.91:1" }),
    ).toThrow();
  });

  it("returns correct dimensions for 9:16 image", () => {
    const r = resolveOutputTarget({ kind: "image", aspectRatio: "9:16" });
    expect(r.width).toBe(1024);
    expect(r.height).toBe(1792);
  });
});
