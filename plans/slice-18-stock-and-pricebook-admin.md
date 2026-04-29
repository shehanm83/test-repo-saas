# Slice 18 — Stock library + price book admin

**Phase:** 4 — Catalogs
**Depends on:** 08, 13

**Definition of done:**
- `StockApi` admin upload (PNG/JPG/SVG) with sanitization, tag list, license/attribution
- Stock embedding generated via AIProvider.describeImage → embed (placeholder until slice 21)
- `PriceBookApi` admin CRUD with versioning + effective-from/to
- `priceBookLookup(modelCode, sizeBucket, premiumFlag, hasInspirationFlag, at?)` returns the active rule
- Tests cover upload, listing, lookup at point in time

---

## Files

**Create:**
- `packages/db/src/queries/stock.ts`
- `packages/db/src/queries/pricebook.ts`
- `packages/api/src/stock.ts`
- `packages/api/src/pricebook.ts`
- `packages/api/src/stock.test.ts`
- `packages/api/src/pricebook.test.ts`

---

## Tasks

- [ ] **Step 1 — Stock queries**

`packages/db/src/queries/stock.ts`:

```ts
import { eq, sql } from "drizzle-orm";
import type { Db } from "../client.js";
import { stockAssets } from "../schema/index.js";

export async function adminInsertStock(db: Db, v: typeof stockAssets.$inferInsert) {
  const [r] = await db.insert(stockAssets).values(v).returning();
  return r;
}

export async function adminListStock(db: Db) { return db.select().from(stockAssets); }

export async function findStockByTags(db: Db, tags: string[], limit = 5) {
  if (tags.length === 0) return [];
  return db.select().from(stockAssets)
    .where(sql`${stockAssets.tags} && ${tags}`)
    .limit(limit);
}

export async function findStockByEmbedding(db: Db, embedding: number[], limit = 5) {
  return db.select({ id: stockAssets.id, s3Key: stockAssets.s3Key, kind: stockAssets.kind, tags: stockAssets.tags })
    .from(stockAssets)
    .orderBy(sql`${stockAssets.embedding} <=> ${sql.raw(`'[${embedding.join(",")}]'`)}::vector`)
    .limit(limit);
}

export async function deleteStock(db: Db, id: string) {
  await db.delete(stockAssets).where(eq(stockAssets.id, id));
}
```

- [ ] **Step 2 — Pricebook queries**

`packages/db/src/queries/pricebook.ts`:

```ts
import { and, asc, desc, eq, isNull, lte, or, gt } from "drizzle-orm";
import type { Db } from "../client.js";
import { priceBookEntries } from "../schema/index.js";

export async function adminListPricebook(db: Db) {
  return db.select().from(priceBookEntries).orderBy(desc(priceBookEntries.version), asc(priceBookEntries.modelCode));
}

export async function adminInsertPricebookEntry(db: Db, v: typeof priceBookEntries.$inferInsert) {
  const [r] = await db.insert(priceBookEntries).values(v).returning();
  return r;
}

export async function priceBookLookup(
  db: Db, args: { modelCode: string; sizeBucket: "standard" | "large"; premiumFlag: boolean; hasInspirationFlag: boolean; at?: Date },
) {
  const at = args.at ?? new Date();
  const [r] = await db.select().from(priceBookEntries).where(and(
    eq(priceBookEntries.modelCode, args.modelCode),
    eq(priceBookEntries.sizeBucket, args.sizeBucket),
    eq(priceBookEntries.premiumFlag, args.premiumFlag),
    eq(priceBookEntries.hasInspirationFlag, args.hasInspirationFlag),
    lte(priceBookEntries.effectiveFrom, at),
    or(isNull(priceBookEntries.effectiveTo), gt(priceBookEntries.effectiveTo, at)),
  )).orderBy(desc(priceBookEntries.version)).limit(1);
  if (!r) throw new Error(`pricebook-not-found:${args.modelCode}/${args.sizeBucket}/${args.premiumFlag}/${args.hasInspirationFlag}`);
  return r;
}

export async function expirePricebookVersion(db: Db, id: string, expireAt: Date) {
  await db.update(priceBookEntries).set({ effectiveTo: expireAt }).where(eq(priceBookEntries.id, id));
}
```

- [ ] **Step 3 — Stock API**

`packages/api/src/stock.ts`:

```ts
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminInsertStock, adminListStock, deleteStock, createDb } from "@vyora/db";
import { keys } from "@vyora/storage";
import { reencodeImage } from "./sanitize/image.js";
import { sanitizeSvg } from "./sanitize/svg.js";
import type { Adapters, Config } from "@vyora/shared";

export class StockApi {
  constructor(private readonly config: Config, private readonly adapters: Adapters) {}
  private db() { return createDb(this.config.db.url, "app_admin"); }

  async adminList() { return adminListStock(this.db()); }

  async adminUpload(input: { kind: "icon" | "photo"; tags: string[]; license: string; attribution?: string; file: { bytes: Buffer; mimeType: string; filename: string } }) {
    const id = randomUUID();
    let key: string; let mimeType: string; let width = 0; let height = 0;

    if (input.file.mimeType === "image/svg+xml" || input.file.filename.endsWith(".svg")) {
      const cleaned = sanitizeSvg(input.file.bytes.toString("utf8"));
      key = keys.globalStock(id, "svg");
      mimeType = "image/svg+xml";
      await this.adapters.storage.putBytes(key, Buffer.from(cleaned, "utf8"), mimeType);
    } else {
      const re = await reencodeImage(input.file.bytes, { format: "png", maxLongEdge: 2048 });
      key = keys.globalStock(id, "png");
      mimeType = re.mimeType; width = re.width; height = re.height;
      await this.adapters.storage.putBytes(key, re.bytes, mimeType);
    }

    return adminInsertStock(this.db(), {
      id, kind: input.kind, s3Key: key, mimeType,
      width: width || null, height: height || null,
      tags: input.tags, license: input.license, attribution: input.attribution,
      embedding: new Array(1536).fill(0), // replaced after slice 21
    } as never);
  }

  async adminDelete(id: string) {
    await deleteStock(this.db(), id);
  }
}
```

- [ ] **Step 4 — Pricebook API**

`packages/api/src/pricebook.ts`:

```ts
import { z } from "zod";
import { createDb, adminListPricebook, adminInsertPricebookEntry, priceBookLookup, expirePricebookVersion } from "@vyora/db";
import type { Config } from "@vyora/shared";

const Entry = z.object({
  modelCode: z.string(),
  sizeBucket: z.enum(["standard", "large"]),
  premiumFlag: z.boolean(),
  hasInspirationFlag: z.boolean(),
  credits: z.number().int().min(1).max(1000),
  version: z.number().int().min(1),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
});

export class PricebookApi {
  constructor(private readonly config: Config) {}
  private db() { return createDb(this.config.db.url, "app_admin"); }

  async list() { return adminListPricebook(this.db()); }

  async insert(input: unknown) {
    const v = Entry.parse(input);
    return adminInsertPricebookEntry(this.db(), {
      ...v,
      effectiveFrom: new Date(v.effectiveFrom),
      effectiveTo: v.effectiveTo ? new Date(v.effectiveTo) : null,
    } as never);
  }

  async expire(id: string, at: string) {
    await expirePricebookVersion(this.db(), id, new Date(at));
  }

  /** Used by the generation API in slice 29. */
  async lookup(args: Parameters<typeof priceBookLookup>[1]) {
    return priceBookLookup(this.db(), args);
  }
}
```

- [ ] **Step 5 — Tests**

`packages/api/src/pricebook.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@vyora/db", () => ({
  createDb: () => ({}),
  adminListPricebook: vi.fn(async () => []),
  adminInsertPricebookEntry: vi.fn(async (_d, v) => ({ id: "p1", ...v })),
  priceBookLookup: vi.fn(async () => ({ credits: 5 })),
  expirePricebookVersion: vi.fn(async () => undefined),
}));

import { PricebookApi } from "./pricebook.js";
const api = new PricebookApi({ db: { url: "" } } as never);

describe("PricebookApi", () => {
  it("rejects out-of-range credits", async () => {
    await expect(api.insert({
      modelCode: "flux-1.1-pro", sizeBucket: "standard", premiumFlag: false, hasInspirationFlag: false,
      credits: 0, version: 1, effectiveFrom: "2026-04-25T00:00:00Z",
    })).rejects.toThrow();
  });
});
```

(Stock test similar shape — mock storage and DB.)

- [ ] **Step 6 — Seed initial price book**

Add `packages/db/scripts/seed-pricebook.ts` that inserts the initial set:

```ts
import { createDb, adminInsertPricebookEntry } from "../src/index.js";
const db = createDb(process.env.DATABASE_URL!, "app_admin");
const v = 1;
const start = new Date("2026-04-25T00:00:00Z");
const rows = [
  // (model, size, premium, inspiration, credits)
  ["flux-1.1-pro", "standard", false, false, 5],
  ["flux-1.1-pro", "standard", false, true,  7],
  ["flux-1.1-pro", "large",    false, false, 8],
  ["flux-1.1-pro", "large",    false, true,  10],
  ["gpt-image-1",  "standard", true,  false, 15],
  ["gpt-image-1",  "standard", true,  true,  17],
  ["gpt-image-1",  "large",    true,  false, 22],
  ["gpt-image-1",  "large",    true,  true,  24],
  ["recraft-v3",   "standard", false, false, 8],
  ["recraft-v3",   "standard", false, true,  10],
  ["bedrock-sd35", "standard", false, false, 3],
  ["bedrock-sd35", "standard", false, true,  4],
] as const;
for (const [m, s, p, i, c] of rows) {
  await adminInsertPricebookEntry(db, {
    modelCode: m, sizeBucket: s, premiumFlag: p, hasInspirationFlag: i,
    credits: c, version: v, effectiveFrom: start,
  } as never);
}
console.warn("price book seeded");
process.exit(0);
```

```bash
pnpm --filter @vyora/db exec tsx scripts/seed-pricebook.ts
```

- [ ] **Step 7 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(api): stock library + price book admin + initial price book seed"
```

---

## Verification

```bash
pnpm test:unit
psql "$DATABASE_URL" -c "SELECT count(*) FROM price_book_entries"   # 12
```

## Commit message

```
feat(api): stock library + price book admin + initial price book seed
```
