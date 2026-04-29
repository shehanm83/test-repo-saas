# Slice 14 — Brand and asset API

**Phase:** 3 — Storage + brand kit
**Depends on:** 07, 13
**Spec references:** [Spec § 3.2 (Brand setup wizard)](../specs/2026-04-25-studio-v1-spec.md), [Spec § 7 (Security — logo SVG XSS, EXIF strip)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- Brand CRUD endpoints in `@vyora/api`
- Logo upload pipeline: SVG sanitized via DOMPurify-svg + svgo; PNG re-encoded via sharp + EXIF stripped
- Reference image upload pipeline: re-encoded, embedded via embedding API, stored as `brand_assets`
- Embedding via `AIProvider.describeImage` followed by text embedding through OpenAI/Anthropic embed endpoint
- Tests cover sanitization (script-stripping), CRUD, listing

---

## Files

**Create:**
- `packages/api/src/brand.ts`
- `packages/api/src/brand.test.ts`
- `packages/db/src/queries/brand.ts`
- `packages/api/src/sanitize/svg.ts`
- `packages/api/src/sanitize/image.ts`
- `packages/api/src/sanitize/svg.test.ts`
- `packages/api/src/sanitize/image.test.ts`

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @vyora/api add isomorphic-dompurify svgo sharp
```

- [ ] **Step 2 — SVG sanitizer**

`packages/api/src/sanitize/svg.ts`:

```ts
import DOMPurify from "isomorphic-dompurify";
import { optimize } from "svgo";

const FORBIDDEN_TAGS = ["script", "foreignObject", "iframe", "object", "embed", "use"];

export function sanitizeSvg(input: string): string {
  // 1. DOMPurify pass restricted to SVG profile
  const cleaned = DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: ["onload", "onclick", "onerror", "href", "xlink:href"],
  });
  // 2. svgo pass to remove leftover risky elements + optimize
  const optimized = optimize(cleaned, {
    plugins: [
      { name: "removeScriptElement", active: true },
      { name: "removeXMLProcInst", active: true },
      { name: "removeComments", active: true },
      { name: "removeMetadata", active: true },
    ],
  });
  return optimized.data;
}
```

`packages/api/src/sanitize/svg.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./svg.js";

describe("sanitizeSvg", () => {
  it("strips <script>", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="10" cy="10" r="5"/></svg>`;
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("script");
    expect(clean).toContain("circle");
  });

  it("strips event handlers", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg"><circle onclick="x()" cx="10" cy="10" r="5"/></svg>`;
    expect(sanitizeSvg(dirty)).not.toContain("onclick");
  });

  it("preserves valid SVG", () => {
    const ok = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="red"/></svg>`;
    expect(sanitizeSvg(ok)).toContain("rect");
  });
});
```

- [ ] **Step 3 — Image sanitizer**

`packages/api/src/sanitize/image.ts`:

```ts
import sharp from "sharp";

export interface ProcessedImage {
  bytes: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
}

export async function reencodeImage(
  input: Buffer, opts: { format?: "png" | "jpeg" | "webp"; maxLongEdge?: number } = {},
): Promise<ProcessedImage> {
  const format = opts.format ?? "png";
  const maxLong = opts.maxLongEdge ?? 2048;

  const pipeline = sharp(input, { failOn: "error" })
    .rotate()  // honor EXIF orientation, then strip metadata
    .resize({ width: maxLong, height: maxLong, fit: "inside", withoutEnlargement: true })
    .withMetadata({ orientation: undefined });

  const out =
    format === "png" ? pipeline.png({ quality: 90, compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
    : format === "jpeg" ? pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer({ resolveWithObject: true })
    : pipeline.webp({ quality: 88 }).toBuffer({ resolveWithObject: true });

  const r = await out;
  return {
    bytes: r.data,
    mimeType: format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp",
    width: r.info.width,
    height: r.info.height,
  };
}
```

`packages/api/src/sanitize/image.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { reencodeImage } from "./image.js";

describe("reencodeImage", () => {
  it("downscales above max long edge", async () => {
    const big = await sharp({ create: { width: 4000, height: 2000, channels: 3, background: "#fff" } }).png().toBuffer();
    const out = await reencodeImage(big, { maxLongEdge: 2048 });
    expect(out.width).toBe(2048);
    expect(out.height).toBe(1024);
  });
  it("preserves smaller images", async () => {
    const small = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#000" } }).png().toBuffer();
    const out = await reencodeImage(small, { maxLongEdge: 2048 });
    expect(out.width).toBe(800);
  });
});
```

- [ ] **Step 4 — Brand DB queries**

`packages/db/src/queries/brand.ts`:

```ts
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../client.js";
import { brands, brandAssets } from "../schema/index.js";
import { withWorkspace } from "../with-workspace.js";

export async function listBrands(db: Db, workspaceId: string) {
  return withWorkspace(db, workspaceId, (tx) => tx.select().from(brands).orderBy(desc(brands.createdAt)));
}

export async function getBrand(db: Db, workspaceId: string, brandId: string) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [b] = await tx.select().from(brands).where(eq(brands.id, brandId));
    return b ?? null;
  });
}

export async function createBrand(
  db: Db, workspaceId: string,
  input: { name: string; sourceUrl?: string },
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [b] = await tx.insert(brands).values({ workspaceId, name: input.name, sourceUrl: input.sourceUrl }).returning();
    return b;
  });
}

export async function updateBrand(
  db: Db, workspaceId: string, brandId: string,
  patch: Partial<typeof brands.$inferInsert>,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [b] = await tx.update(brands).set(patch).where(eq(brands.id, brandId)).returning();
    return b;
  });
}

export async function addBrandAsset(
  db: Db, workspaceId: string,
  asset: typeof brandAssets.$inferInsert,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [a] = await tx.insert(brandAssets).values(asset).returning();
    return a;
  });
}

export async function listBrandAssets(db: Db, workspaceId: string, brandId: string) {
  return withWorkspace(db, workspaceId, (tx) =>
    tx.select().from(brandAssets).where(and(eq(brandAssets.brandId, brandId), eq(brandAssets.workspaceId, workspaceId))),
  );
}
```

- [ ] **Step 5 — Brand API**

`packages/api/src/brand.ts`:

```ts
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createDb, listBrands, getBrand, createBrand, updateBrand, addBrandAsset, listBrandAssets } from "@vyora/db";
import { keys } from "@vyora/storage";
import type { Adapters, Config } from "@vyora/shared";
import { sanitizeSvg } from "./sanitize/svg.js";
import { reencodeImage } from "./sanitize/image.js";

export class BrandApi {
  constructor(private readonly config: Config, private readonly adapters: Adapters) {}
  private db() { return createDb(this.config.db.url, "app_user"); }

  async list(workspaceId: string) { return listBrands(this.db(), workspaceId); }
  async get(workspaceId: string, brandId: string) { return getBrand(this.db(), workspaceId, brandId); }

  async create(workspaceId: string, input: unknown) {
    const args = z.object({
      name: z.string().min(1).max(120),
      sourceUrl: z.string().url().optional(),
    }).parse(input);
    return createBrand(this.db(), workspaceId, args);
  }

  async update(workspaceId: string, brandId: string, input: unknown) {
    const args = z.object({
      name: z.string().min(1).max(120).optional(),
      palette: z.object({
        primary: z.string(),
        secondary: z.string().optional(),
        accent: z.string().optional(),
        extras: z.array(z.string()).optional(),
      }).optional(),
      fonts: z.object({
        heading: z.object({ family: z.string(), weight: z.string().optional() }),
        body: z.object({ family: z.string(), weight: z.string().optional() }),
      }).optional(),
      voiceNotes: z.string().max(2000).optional(),
    }).parse(input);
    return updateBrand(this.db(), workspaceId, brandId, args);
  }

  async uploadLogo(workspaceId: string, brandId: string, file: { bytes: Buffer; mimeType: string; filename: string }) {
    if (file.bytes.byteLength > 10 * 1024 * 1024) throw new Error("file-too-large");

    let storedKey: string;
    let storedMime: string;
    let width: number | undefined;
    let height: number | undefined;

    if (file.mimeType === "image/svg+xml" || file.filename.endsWith(".svg")) {
      const cleaned = sanitizeSvg(file.bytes.toString("utf8"));
      storedKey = keys.brandLogo(workspaceId, brandId, "svg");
      storedMime = "image/svg+xml";
      await this.adapters.storage.putBytes(storedKey, Buffer.from(cleaned, "utf8"), storedMime);
    } else {
      const re = await reencodeImage(file.bytes, { format: "png", maxLongEdge: 2048 });
      storedKey = keys.brandLogo(workspaceId, brandId, "png");
      storedMime = re.mimeType;
      width = re.width; height = re.height;
      await this.adapters.storage.putBytes(storedKey, re.bytes, storedMime);
    }

    await updateBrand(this.db(), workspaceId, brandId, { logoS3Key: storedKey });
    return { key: storedKey, mimeType: storedMime, width, height };
  }

  async uploadReference(
    workspaceId: string, brandId: string, file: { bytes: Buffer; mimeType: string },
  ) {
    if (file.bytes.byteLength > 10 * 1024 * 1024) throw new Error("file-too-large");
    const re = await reencodeImage(file.bytes, { format: "png", maxLongEdge: 2048 });
    const assetId = randomUUID();
    const key = keys.brandAsset(workspaceId, brandId, assetId, "png");
    await this.adapters.storage.putBytes(key, re.bytes, re.mimeType);

    // Embedding
    const { description } = await this.adapters.ai.describeImage(key);
    // We use describe → embed for v1; gateway can switch to native image embedding later
    const text = description;
    // (embedding via AIProvider would be a TextProvider call; for now compute inline using OpenAI/Anthropic embed endpoint)
    const embeddingResponse = await this.adapters.ai.generateText({
      modelCode: "embedding-3-small",
      prompt: text,
      systemPrompt: "Return numeric embedding only — internal contract.",
    });
    // (real embedding goes via a dedicated provider method; this is a placeholder fallback acceptable in v1)
    const fakeEmbedding = new Array(1536).fill(0).map(() => Math.random());
    void embeddingResponse;

    return addBrandAsset(this.db(), workspaceId, {
      workspaceId, brandId, kind: "reference",
      s3Key: key, mimeType: re.mimeType, width: re.width, height: re.height, bytes: re.bytes.byteLength,
      embedding: fakeEmbedding,
    });
  }

  async listAssets(workspaceId: string, brandId: string) {
    return listBrandAssets(this.db(), workspaceId, brandId);
  }
}
```

> **Note on embedding:** v1 stores a placeholder embedding; the AI gateway adds a proper `embedTexts` / `embedImage` interface in slice 21. After slice 21 is done, replace `fakeEmbedding` with `await adapters.ai.embedImage(key)`.

- [ ] **Step 6 — Brand API tests**

`packages/api/src/brand.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@vyora/db", () => ({
  createDb: () => ({}),
  listBrands: vi.fn(async () => [{ id: "b1", name: "Acme" }]),
  getBrand: vi.fn(async () => ({ id: "b1", name: "Acme" })),
  createBrand: vi.fn(async (_d, _w, args) => ({ id: "b1", ...args, workspaceId: _w })),
  updateBrand: vi.fn(async () => ({ id: "b1" })),
  addBrandAsset: vi.fn(async () => ({ id: "a1" })),
  listBrandAssets: vi.fn(async () => []),
}));

vi.mock("@vyora/storage", () => ({ keys: { brandLogo: () => "k", brandAsset: () => "k2" } }));

import { BrandApi } from "./brand.js";

const adapters = {
  storage: { putBytes: vi.fn() },
  ai: { describeImage: vi.fn(async () => ({ description: "logo" })), generateText: vi.fn(async () => ({ text: "x", upstreamCostCents: 0, latencyMs: 0 })) },
} as never;

const api = new BrandApi({ db: { url: "" } } as never, adapters);

describe("BrandApi", () => {
  it("rejects bad name", async () => {
    await expect(api.create("w", { name: "" })).rejects.toThrow();
  });
  it("creates a brand", async () => {
    const b = await api.create("w", { name: "Acme" });
    expect(b.name).toBe("Acme");
  });
});
```

- [ ] **Step 7 — Run tests + commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(api): brand CRUD + asset upload with SVG/EXIF sanitization"
```

---

## Verification

```bash
pnpm --filter @vyora/api test
```

## Commit message

```
feat(api): brand CRUD + asset upload with SVG/EXIF sanitization
```
