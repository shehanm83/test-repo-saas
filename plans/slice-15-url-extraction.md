# Slice 15 — URL extraction (SSRF-safe brand discovery)

**Phase:** 3 — Storage + brand kit
**Depends on:** 14
**Spec references:** [Spec § 3.2 step 1 (URL pre-fill)](../specs/2026-04-25-studio-v1-spec.md), [Spec § 7 (URL extraction SSRF)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `extractFromUrl(url)` fetches a webpage SSRF-safely and returns `{ title, dominantColors[], candidateLogos[], description }`
- IP-address allowlist check (rejects 10/8, 172.16/12, 192.168/16, ::1, link-local)
- HTTPS-only, 5s timeout, max 5 MB body
- Tests cover SSRF rejection + happy path against a fixture HTML page

---

## Files

**Create:**
- `packages/api/src/url-extract/index.ts`
- `packages/api/src/url-extract/ssrf.ts`
- `packages/api/src/url-extract/fetch.ts`
- `packages/api/src/url-extract/colors.ts`
- `packages/api/src/url-extract/index.test.ts`
- `packages/api/src/url-extract/ssrf.test.ts`

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @studio/api add cheerio node-vibrant
```

- [ ] **Step 2 — `ssrf.ts`**

```ts
import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";

const PRIVATE_RANGES_V4 = [
  /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^192\.168\./, /^0\./,
];
const PRIVATE_RANGES_V6 = [/^::1$/, /^fc/i, /^fe80/i];

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return PRIVATE_RANGES_V4.some((re) => re.test(ip));
  if (net.isIPv6(ip)) return PRIVATE_RANGES_V6.some((re) => re.test(ip));
  return false;
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  if (!hostname) throw new Error("ssrf:empty-host");
  if (hostname === "localhost") throw new Error("ssrf:localhost");
  const records = await dnsLookup(hostname, { all: true });
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error(`ssrf:private-ip:${r.address}`);
  }
}

export async function assertSafeUrl(url: string): Promise<URL> {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("ssrf:not-https");
  await assertPublicHostname(u.hostname);
  return u;
}
```

- [ ] **Step 3 — `fetch.ts`**

```ts
import { assertSafeUrl } from "./ssrf.js";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 5000;

export async function safeFetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const u = await assertSafeUrl(url);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(u.href, { signal: ac.signal, redirect: "follow", headers: { "User-Agent": "StudioBot/1.0" } });
    if (!res.ok) throw new Error(`fetch-status-${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) throw new Error("not-html");
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error("body-too-large");
      chunks.push(value);
    }
    const html = Buffer.concat(chunks).toString("utf8");
    return { html, finalUrl: res.url };
  } finally { clearTimeout(t); }
}
```

- [ ] **Step 4 — `colors.ts`**

```ts
import Vibrant from "node-vibrant";

export async function extractDominantColors(imageUrl: string): Promise<string[]> {
  const palette = await Vibrant.from(imageUrl).getPalette();
  return Object.values(palette).filter(Boolean).map((s) => s!.hex);
}
```

- [ ] **Step 5 — `index.ts`**

```ts
import { load } from "cheerio";
import { safeFetchHtml } from "./fetch.js";
import { extractDominantColors } from "./colors.js";

export interface UrlExtraction {
  title?: string;
  description?: string;
  candidateLogos: string[];
  dominantColors: string[];
}

export async function extractFromUrl(url: string): Promise<UrlExtraction> {
  const { html, finalUrl } = await safeFetchHtml(url);
  const $ = load(html);
  const title = $("title").first().text() || $("meta[property='og:title']").attr("content");
  const description = $("meta[name='description']").attr("content") ?? $("meta[property='og:description']").attr("content");

  const candidateLogos = new Set<string>();
  $('link[rel*="icon"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) candidateLogos.add(new URL(href, finalUrl).href);
  });
  $('meta[property="og:image"]').each((_, el) => {
    const c = $(el).attr("content");
    if (c) candidateLogos.add(new URL(c, finalUrl).href);
  });

  const firstLogo = [...candidateLogos][0];
  const dominantColors = firstLogo ? await extractDominantColors(firstLogo).catch(() => []) : [];

  return {
    title: title?.trim(),
    description: description?.trim(),
    candidateLogos: [...candidateLogos],
    dominantColors,
  };
}
```

- [ ] **Step 6 — Tests**

`ssrf.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isPrivateIp, assertSafeUrl } from "./ssrf.js";

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
```

`index.test.ts`: provide a fixture HTML and mock `safeFetchHtml`/`extractDominantColors`; assert title and logo extraction.

- [ ] **Step 7 — Add to BrandApi**

In `packages/api/src/brand.ts`, add a method:

```ts
async extractFromUrl(input: unknown): Promise<UrlExtraction> {
  const { url } = z.object({ url: z.string().url() }).parse(input);
  const { extractFromUrl } = await import("./url-extract/index.js");
  return extractFromUrl(url);
}
```

- [ ] **Step 8 — Commit**

```bash
git add -A
git commit -m "feat(api): SSRF-safe URL extraction for brand pre-fill"
```

---

## Verification

```bash
pnpm --filter @studio/api test
```

## Commit message

```
feat(api): SSRF-safe URL extraction for brand pre-fill
```
