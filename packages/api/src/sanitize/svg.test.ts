import { describe, expect, it } from "vitest";

import { sanitizeSvg, svgDimensions } from "./svg";

describe("sanitizeSvg", () => {
  it("strips script tags", () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="10" cy="10" r="5"/></svg>';

    const clean = sanitizeSvg(dirty);

    expect(clean).not.toContain("script");
    expect(clean).toContain("circle");
  });

  it("strips event handlers", () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg"><circle onclick="x()" cx="10" cy="10" r="5"/></svg>';

    expect(sanitizeSvg(dirty)).not.toContain("onclick");
  });
});

describe("svgDimensions", () => {
  it("reads plain pixel width and height", () => {
    expect(svgDimensions('<svg width="400" height="100px"></svg>')).toEqual({
      width: 400,
      height: 100,
    });
  });

  it("falls back to the viewBox when the size is relative", () => {
    expect(svgDimensions('<svg width="100%" height="100%" viewBox="0 0 512 128"></svg>')).toEqual({
      width: 512,
      height: 128,
    });
  });

  it("returns null when the size cannot be determined", () => {
    expect(svgDimensions("<svg></svg>")).toBeNull();
    expect(svgDimensions('<svg viewBox="0 0 0 0"></svg>')).toBeNull();
  });
});
