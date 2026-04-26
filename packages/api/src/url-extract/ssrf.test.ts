import { describe, expect, it } from "vitest";

import { assertSafeUrl, isPrivateIp } from "./ssrf";

describe("SSRF guard", () => {
  it("flags private IPv4", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("127.0.0.1")).toBe(true);
  });

  it("allows public IPv4", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("rejects http URLs", async () => {
    await expect(assertSafeUrl("http://example.com")).rejects.toThrow(/not-https/);
  });

  it("rejects localhost", async () => {
    await expect(assertSafeUrl("https://localhost/")).rejects.toThrow(/localhost/);
  });
});
