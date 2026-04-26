import { describe, expect, it } from "vitest";

import { sanitizeSvg } from "./svg";

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
