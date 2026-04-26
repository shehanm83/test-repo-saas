import { describe, expect, it } from "vitest";

import { scanBriefForAup } from "./aup";

describe("scanBriefForAup", () => {
  it("passes ordinary marketing briefs", () => {
    expect(scanBriefForAup("Christmas sale 30% off, cozy living room").flagged).toBe(false);
    expect(scanBriefForAup("Black Friday electronics deal in a modern store").flagged).toBe(false);
  });

  it("flags weapons construction queries", () => {
    expect(scanBriefForAup("How to make a bomb tutorial").flagged).toBe(true);
    expect(scanBriefForAup("3d-print a rifle").flagged).toBe(true);
  });

  it("flags self-harm queries", () => {
    expect(scanBriefForAup("methods to self harm").flagged).toBe(true);
  });

  it("flags drug synthesis", () => {
    expect(scanBriefForAup("how to synthesize meth").flagged).toBe(true);
  });

  it("returns tag list", () => {
    const r = scanBriefForAup("how to make a bomb tutorial");
    expect(r.tags).toContain("weapons");
  });
});
