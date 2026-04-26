import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  safeFetchHtml: vi.fn(),
  extractDominantColors: vi.fn(),
}));

vi.mock("./fetch", () => ({
  safeFetchHtml: mocks.safeFetchHtml,
}));

vi.mock("./colors", () => ({
  extractDominantColors: mocks.extractDominantColors,
}));

import { extractFromUrl } from "./index";

describe("extractFromUrl", () => {
  it("extracts page metadata and logos", async () => {
    mocks.safeFetchHtml.mockResolvedValueOnce({
      html: `
        <html>
          <head>
            <title>Acme</title>
            <meta name="description" content="Brand description" />
            <link rel="icon" href="/favicon.png" />
            <meta property="og:image" content="https://cdn.example.com/logo.png" />
          </head>
        </html>
      `,
      finalUrl: "https://example.com/landing",
    });
    mocks.extractDominantColors.mockResolvedValueOnce(["#000000", "#ffffff"]);

    const result = await extractFromUrl("https://example.com");

    expect(result.title).toBe("Acme");
    expect(result.description).toBe("Brand description");
    expect(result.candidateLogos).toEqual([
      "https://example.com/favicon.png",
      "https://cdn.example.com/logo.png",
    ]);
    expect(result.dominantColors).toEqual(["#000000", "#ffffff"]);
  });
});
