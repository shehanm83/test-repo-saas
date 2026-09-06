# Stock Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a curated certification-mark stock library that users can optionally pick from during generation, feeding the selected icon as a reference image into the AI model.

**Architecture:** Add `category` and `label` to the `stock_assets` DB table (drop + recreate, fresh DB), extend the generation input contract to accept `stockAssetId`, and resolve that ID to an S3 reference in the generation API. The admin panel gets category browsing, search, delete, and edit-in-place. The QuickCreate UI gets a collapsible stock picker panel.

**Tech Stack:** Drizzle ORM (PostgreSQL), Zod (shared contract), Next.js App Router (server + client components), AWS S3 signed URLs, SQS-backed generation worker.

---

## File Map

| File | Change |
|---|---|
| `packages/db/src/schema/catalog.ts` | Add `category`, `label` columns to `stockAssets` |
| `packages/db/src/queries/stock.ts` | Add `adminUpdateStock`; `adminListStock` gains new columns automatically |
| `packages/db/src/index.ts` | Export `adminUpdateStock` |
| `packages/db/src/migrations/0018_stock_category_label.sql` | Drop + recreate `stock_assets` with new columns |
| `packages/shared/src/generation/commercial-contract.ts` | Add `stockAssetId` to `CommercialInput` + `NormalizedCommercialGenerationInput` + normalizer |
| `packages/api/src/stock.ts` | Add `category`/`label` to `adminUpload`; new `adminUpdate` method |
| `packages/api/src/generation.ts` | Resolve `stockAssetId` → S3 key, append to inspiration refs |
| `apps/web/app/api/admin/stock/route.ts` | Accept `category`, `label`, `tags` in POST |
| `apps/web/app/api/admin/stock/[id]/route.ts` | NEW: DELETE + PATCH (edit-in-place) |
| `apps/web/app/admin/stock/page.tsx` | Pass `category` query param; pass items with signed URLs (already done) |
| `apps/web/components/admin/stock-admin.tsx` | Category tabs, search, label display, delete, edit panel, upload form |
| `apps/web/components/generate/commercial/types.ts` | Add `stockAssetId` to `GenerateState` + `GeneratePayload`; add `StockAssetLite` |
| `apps/web/app/(app)/generate/page.tsx` | Fetch stock assets + sign URLs, pass to QuickCreate |
| `apps/web/components/generate/commercial/quick-create.tsx` | Collapsible stock picker section |

---

## Task 1: DB Schema — drop and recreate `stock_assets`

**Files:**
- Modify: `packages/db/src/schema/catalog.ts`
- Create: `packages/db/src/migrations/0018_stock_category_label.sql`

- [ ] **Step 1: Update Drizzle schema**

In `packages/db/src/schema/catalog.ts`, replace the `stockAssets` table definition (lines 66–81):

```ts
export const stockAssets = pgTable("stock_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category", {
    enum: ["food-dietary", "food-safety", "cosmetics", "manufacturing", "wellness"],
  }).notNull(),
  kind: text("kind", { enum: ["icon", "photo"] }).notNull().default("icon"),
  label: text("label").notNull(),
  s3Key: text("s3_key").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  tags: text("tags")
    .array()
    .notNull()
    .default([] as never),
  embedding: vector("embedding", { dimensions: 1536 }),
  license: text("license"),
  attribution: text("attribution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Write migration SQL**

Create `packages/db/src/migrations/0018_stock_category_label.sql`:

```sql
-- Drop existing table (fresh production — no data to preserve)
DROP TABLE IF EXISTS stock_assets CASCADE;

CREATE TABLE stock_assets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text        NOT NULL,
  kind        text        NOT NULL DEFAULT 'icon',
  label       text        NOT NULL,
  s3_key      text        NOT NULL,
  mime_type   text        NOT NULL,
  width       integer,
  height      integer,
  tags        text[]      NOT NULL DEFAULT ARRAY[]::text[],
  embedding   vector(1536),
  license     text,
  attribution text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stock_embedding_idx
  ON stock_assets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE stock_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY stock_user_read  ON stock_assets FOR SELECT TO app_user  USING (true);
CREATE POLICY stock_admin_all  ON stock_assets FOR ALL    TO app_admin USING (true);

GRANT SELECT ON stock_assets TO app_user;
GRANT ALL    ON stock_assets TO app_admin;
```

- [ ] **Step 3: Run migration**

```bash
cd packages/db
pnpm migrate
```

Expected: migration 0018 applies, no errors. Verify with:
```bash
psql $DATABASE_URL -c "\d stock_assets"
```
Expected: columns `id, category, kind, label, s3_key, mime_type, width, height, tags, embedding, license, attribution, created_at`.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @layertone/db typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/catalog.ts packages/db/src/migrations/0018_stock_category_label.sql
git commit -m "feat(db): rebuild stock_assets with category and label columns"
```

---

## Task 2: DB Queries — add `adminUpdateStock`

**Files:**
- Modify: `packages/db/src/queries/stock.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Add `adminUpdateStock` to query file**

In `packages/db/src/queries/stock.ts`, add after `adminInsertStock`:

```ts
export async function adminUpdateStock(
  db: Db,
  id: string,
  patch: { label?: string; category?: string; tags?: string[] },
) {
  const [updated] = await db
    .update(stockAssets)
    .set({
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.category !== undefined ? { category: patch.category as typeof stockAssets.$inferInsert["category"] } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    })
    .where(eq(stockAssets.id, id))
    .returning();
  return updated ?? null;
}
```

Also add `getStockById` used by the generation API to resolve a stock asset from its ID:

```ts
export async function getStockById(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(stockAssets)
    .where(eq(stockAssets.id, id))
    .limit(1);
  return row ?? null;
}
```

- [ ] **Step 2: Export from `packages/db/src/index.ts`**

Open `packages/db/src/index.ts` and find the stock exports block. Add:

```ts
export { adminUpdateStock, getStockById } from "./queries/stock";
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @layertone/db typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/queries/stock.ts packages/db/src/index.ts
git commit -m "feat(db): add adminUpdateStock and getStockById queries"
```

---

## Task 3: Shared Contract — add `stockAssetId` to generation input

**Files:**
- Modify: `packages/shared/src/generation/commercial-contract.ts`

- [ ] **Step 1: Add `stockAssetId` to `CommercialInput` schema**

In `packages/shared/src/generation/commercial-contract.ts`, find `const CommercialInput = z.object({` (around line 146). Add `stockAssetId` after the `inspirationInfluence` line:

```ts
const CommercialInput = z.object({
  // ... existing fields ...
  inspirationInfluence: z.enum(["subtle", "balanced", "strong"]).optional(),
  stockAssetId: UUID.nullable().optional(),   // ← add this line
  flags: LegacyInput.shape.flags,
});
```

- [ ] **Step 2: Add `stockAssetId` to `NormalizedCommercialGenerationInput` type**

Find the `NormalizedCommercialGenerationInput` type (around line 175). Add:

```ts
export type NormalizedCommercialGenerationInput = {
  // ... existing fields ...
  inspirationUploadIds: string[];
  inspirationInfluence?: "subtle" | "balanced" | "strong";
  stockAssetId: string | null;   // ← add this line
  flags: { ... };
};
```

- [ ] **Step 3: Add `stockAssetId` to the normalizer function**

Find `normalizeCommercialGenerationInput` (around line 238). In both the legacy branch and the commercial branch, add `stockAssetId` to the returned `normalized` object. In the commercial branch (the `else` / main branch):

```ts
const normalized: NormalizedCommercialGenerationInput = {
  // ... existing fields ...
  inspirationUploadIds: uploadIds,
  stockAssetId: parsed.stockAssetId ?? null,   // ← add this line
};
```

Do the same in the legacy branch:

```ts
const normalized: NormalizedCommercialGenerationInput = {
  // ... existing fields ...
  inspirationUploadIds: uploadIds,
  stockAssetId: null,   // legacy input has no stock concept
};
```

- [ ] **Step 4: Write a unit test**

In `packages/shared/src/generation/commercial-contract.ts`'s test file (or create `packages/shared/src/generation/commercial-contract.test.ts` if it doesn't exist):

```ts
import { describe, it, expect } from "vitest";
import { normalizeCommercialGenerationInput } from "./commercial-contract";

describe("normalizeCommercialGenerationInput — stockAssetId", () => {
  const BASE = {
    mode: "quick",
    creationType: "single_product",
    brandId: "00000000-0000-0000-0000-000000000001",
    brief: "test brief",
    productRefs: [],
    outputs: { variants: 1, quality: "standard", consistency: "off", formats: ["instagram_square"] },
  } as const;

  it("passes through a valid stockAssetId", () => {
    const id = "00000000-0000-0000-0000-000000000099";
    const result = normalizeCommercialGenerationInput({ ...BASE, stockAssetId: id });
    expect(result.stockAssetId).toBe(id);
  });

  it("defaults to null when stockAssetId is omitted", () => {
    const result = normalizeCommercialGenerationInput(BASE);
    expect(result.stockAssetId).toBeNull();
  });

  it("accepts null explicitly", () => {
    const result = normalizeCommercialGenerationInput({ ...BASE, stockAssetId: null });
    expect(result.stockAssetId).toBeNull();
  });
});
```

- [ ] **Step 5: Run the test**

```bash
pnpm --filter @layertone/shared test -- --reporter=verbose commercial-contract
```
Expected: 3 tests pass.

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @layertone/shared typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/generation/commercial-contract.ts packages/shared/src/generation/commercial-contract.test.ts
git commit -m "feat(shared): add stockAssetId to generation input contract"
```

---

## Task 4: API — update `StockApi` with `category`, `label`, and `adminUpdate`

**Files:**
- Modify: `packages/api/src/stock.ts`

- [ ] **Step 1: Update `adminUpload` to accept `category` and `label`**

In `packages/api/src/stock.ts`, find `const UploadInput = z.object({`. Replace with:

```ts
const UploadInput = z.object({
  kind: z.enum(["icon", "photo"]),
  category: z.enum(["food-dietary", "food-safety", "cosmetics", "manufacturing", "wellness"]),
  label: z.string().min(1).max(120),
  tags: z.array(z.string()).default([]),
  license: z.string().min(1),
  attribution: z.string().optional(),
});
```

Update `adminUpload` method signature:

```ts
async adminUpload(input: {
  kind: "icon" | "photo";
  category: "food-dietary" | "food-safety" | "cosmetics" | "manufacturing" | "wellness";
  label: string;
  tags: string[];
  license: string;
  attribution?: string;
  file: { bytes: Buffer; mimeType: string; filename: string };
}) {
  const args = UploadInput.parse(input);
  // ... rest of method unchanged ...
  return adminInsertStock(this.db(), {
    id,
    category: args.category,
    kind: args.kind,
    label: args.label,
    s3Key,
    mimeType,
    width,
    height,
    tags: args.tags,
    license: args.license,
    attribution: args.attribution ?? null,
    embedding: new Array(1536).fill(0),
  });
}
```

- [ ] **Step 2: Add `adminUpdate` method**

After `adminUpload`, add:

```ts
async adminUpdate(
  id: string,
  patch: { label?: string; category?: string; tags?: string[] },
) {
  return adminUpdateStock(this.db(), id, patch);
}
```

Update the import at the top to include `adminUpdateStock`:

```ts
import { adminInsertStock, adminListStock, adminUpdateStock, createDb, deleteStock } from "@layertone/db";
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @layertone/api typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/stock.ts
git commit -m "feat(api): add category/label to stock upload, add adminUpdate"
```

---

## Task 5: API — wire `stockAssetId` into `GenerationApi.create`

**Files:**
- Modify: `packages/api/src/generation.ts`

- [ ] **Step 1: Import `getStockById`**

At the top of `packages/api/src/generation.ts`, add `getStockById` to the `@layertone/db` import:

```ts
import {
  // ... existing imports ...
  updateGenerationInspirationKey,
  getStockById,
  // ...
} from "@layertone/db";
```

- [ ] **Step 2: Resolve stock asset after inspiration handling**

In `GenerationApi.create`, after the inspiration upload block (after `updateGenerationInspirationKey` call, around line 144), add:

```ts
// Append stock reference to inspiration keys if a stock asset was selected
if (v.stockAssetId) {
  const stockAsset = await getStockById(this.db("app_admin"), v.stockAssetId);
  if (stockAsset) {
    // Parse existing keys (may have been set by inspiration uploads above)
    const existingJson = await this.db("app_admin")
      .select({ inspirationImageS3Key: generations.inspirationImageS3Key })
      .from(generations)
      .where(eq(generations.id, genId))
      .limit(1)
      .then((rows) => rows[0]?.inspirationImageS3Key ?? null);

    const existingKeys: string[] = existingJson
      ? (JSON.parse(existingJson) as string[])
      : [];

    await updateGenerationInspirationKey(
      this.db("app_admin"),
      genId,
      JSON.stringify([stockAsset.s3Key, ...existingKeys]),
    );
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @layertone/api typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/generation.ts
git commit -m "feat(api): resolve stockAssetId to S3 reference in generation pipeline"
```

---

## Task 6: Web — admin stock API routes

**Files:**
- Modify: `apps/web/app/api/admin/stock/route.ts`
- Create: `apps/web/app/api/admin/stock/[id]/route.ts`

- [ ] **Step 1: Update POST handler to accept `category` and `label`**

Replace `apps/web/app/api/admin/stock/route.ts` with:

```ts
import { NextResponse } from "next/server";

import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";
import { writeAdminAudit } from "@/lib/server/admin";

export async function GET() {
  const payload = await new StockApi(loadConfig(), createServerAdapters() as never).adminList();
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const formData = await request.formData();

  const files = formData.getAll("files");
  const singleFile = formData.get("file");
  const fileList = files.length > 0 ? files : singleFile ? [singleFile] : [];

  if (fileList.length === 0) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }

  const category = formData.get("category") as string;
  const label = formData.get("label") as string;
  const tags = JSON.parse((formData.get("tags") as string) ?? "[]") as string[];
  const license = (formData.get("license") as string) ?? "internal";

  if (!category || !label) {
    return NextResponse.json({ error: "missing-category-or-label" }, { status: 400 });
  }

  const api = new StockApi(loadConfig(), createServerAdapters() as never);
  const results = [];

  for (const fileEntry of fileList) {
    if (!(fileEntry instanceof File)) continue;
    // Derive per-file label from filename when batch uploading
    const fileLabel =
      fileList.length === 1
        ? label
        : fileEntry.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

    const payload = await api.adminUpload({
      kind: "icon",
      category: category as never,
      label: fileLabel,
      tags,
      license,
      file: {
        bytes: Buffer.from(await fileEntry.arrayBuffer()),
        mimeType: fileEntry.type,
        filename: fileEntry.name,
      },
    });

    if (session.workspaceId) {
      await writeAdminAudit({
        workspaceId: session.workspaceId,
        actorUserId: session.userId,
        action: "admin.stock.upload",
        target: payload.id,
        payload: { category, label: fileLabel, tags },
      });
    }
    results.push(payload);
  }

  return NextResponse.json(results.length === 1 ? results[0] : results);
}
```

- [ ] **Step 2: Create `[id]/route.ts` for DELETE and PATCH**

Create `apps/web/app/api/admin/stock/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";

import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";
import { writeAdminAudit } from "@/lib/server/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session } = await getSessionWorkspace();
  const api = new StockApi(loadConfig(), createServerAdapters() as never);
  await api.adminDelete(id);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.stock.delete",
      target: id,
      payload: {},
    });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { session } = await getSessionWorkspace();
  const body = (await request.json()) as { label?: string; category?: string; tags?: string[] };
  const api = new StockApi(loadConfig(), createServerAdapters() as never);
  const updated = await api.adminUpdate(id, body);
  if (!updated) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.stock.update",
      target: id,
      payload: body,
    });
  }
  return NextResponse.json(updated);
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @layertone/web typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/admin/stock/route.ts apps/web/app/api/admin/stock/[id]/route.ts
git commit -m "feat(web/api): update stock POST for category/label/batch; add DELETE+PATCH by id"
```

---

## Task 7: Web — rewrite `StockAdmin` component

**Files:**
- Modify: `apps/web/components/admin/stock-admin.tsx`
- Modify: `apps/web/app/admin/stock/page.tsx`

This is the largest component task. The new UI has:
- Upload form with `label`, `category` dropdown, `tags`, multi-file support
- Category filter tabs
- Keyword search (client-side, filters by label+tags)
- Delete button on each card
- Edit-in-place panel (click a card → inline form for label/category/tags)

- [ ] **Step 1: Update the page to pass `category` filter**

Replace `apps/web/app/admin/stock/page.tsx`:

```ts
import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { StockAdmin } from "@/components/admin/stock-admin";
import { createServerAdapters } from "@/lib/server/adapters";

export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const config = loadConfig();
  const items = await new StockApi(config, createServerAdapters() as never).adminList();

  const storage = new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketGlobal,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey
      ? { secretAccessKey: config.storage.secretAccessKey }
      : {}),
  });

  const itemsWithUrls = await Promise.all(
    items.map(async (item) => ({
      ...item,
      url: await storage.getSignedUrl(item.s3Key, 3600).catch(() => null),
    })),
  );

  return <StockAdmin items={itemsWithUrls as never} />;
}
```

- [ ] **Step 2: Rewrite `StockAdmin` component**

Replace the entire contents of `apps/web/components/admin/stock-admin.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";
import {
  AdminAlert,
  AdminEmpty,
  AdminPage,
  AdminSection,
  AdminStat,
  AdminStatGrid,
  formatAdminNumber,
} from "@/components/admin/ui";

type Category = "food-dietary" | "food-safety" | "cosmetics" | "manufacturing" | "wellness";

const CATEGORIES: Array<{ key: Category | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "food-dietary", label: "Food · Dietary" },
  { key: "food-safety", label: "Food · Safety" },
  { key: "cosmetics", label: "Cosmetics" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "wellness", label: "Wellness" },
];

type StockItem = {
  id: string;
  category: string;
  kind: string;
  label: string;
  tags: string[];
  license: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  url?: string | null;
};

export function StockAdmin(props: { items: StockItem[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Upload form state
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadCategory, setUploadCategory] = useState<Category>("food-dietary");
  const [uploadTags, setUploadTags] = useState("");

  // Edit form state
  const [editLabel, setEditLabel] = useState("");
  const [editCategory, setEditCategory] = useState<Category>("food-dietary");
  const [editTags, setEditTags] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return props.items.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch =
        !q ||
        item.label.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [props.items, activeCategory, search]);

  const photos = props.items.filter((item) => item.kind === "photo").length;
  const icons = props.items.filter((item) => item.kind === "icon").length;
  const tagged = props.items.filter((item) => item.tags.length > 0).length;

  function startEdit(item: StockItem) {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditCategory(item.category as Category);
    setEditTags(item.tags.join(", "));
  }

  async function upload(files: FileList) {
    if (!uploadLabel && files.length === 1) {
      setMessage({ ok: false, text: "Enter a label before uploading." });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      Array.from(files).forEach((file) => body.append("files", file));
      body.append("label", uploadLabel || files[0]!.name.replace(/\.[^.]+$/, ""));
      body.append("category", uploadCategory);
      body.append("tags", JSON.stringify(uploadTags.split(",").map((t) => t.trim()).filter(Boolean)));
      body.append("license", "internal");
      const res = await fetch("/api/admin/stock", { method: "POST", body });
      if (!res.ok) {
        setMessage({ ok: false, text: await res.text() });
        return;
      }
      setMessage({ ok: true, text: `${files.length} asset${files.length > 1 ? "s" : ""} uploaded.` });
      setUploadLabel("");
      setUploadTags("");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/admin/stock/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ ok: false, text: "Delete failed." });
      return;
    }
    setMessage({ ok: true, text: "Asset deleted." });
    router.refresh();
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/stock/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: editLabel,
          category: editCategory,
          tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        setMessage({ ok: false, text: "Save failed." });
        return;
      }
      setEditingId(null);
      setMessage({ ok: true, text: "Asset updated." });
      router.refresh();
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <AdminPage
      eyebrow={
        <>
          <I.Image size={12} />
          Content
        </>
      }
      title="Stock Library"
      description="Upload, tag, and curate certification marks used as reference inputs during generation."
    >
      <AdminStatGrid>
        <AdminStat
          label="Assets"
          value={formatAdminNumber(props.items.length)}
          detail="Total curated stock"
          icon={<I.Image size={14} />}
        />
        <AdminStat
          label="Icons"
          value={formatAdminNumber(icons)}
          detail="Certification marks"
          icon={<I.Square size={14} />}
        />
        <AdminStat
          label="Photos"
          value={formatAdminNumber(photos)}
          detail="Photo references"
          icon={<I.Grid size={14} />}
        />
        <AdminStat
          label="Tagged"
          value={formatAdminNumber(tagged)}
          detail="Searchable assets"
          icon={<I.Tag size={14} />}
          tone={tagged === props.items.length && props.items.length > 0 ? "success" : "warning"}
        />
      </AdminStatGrid>

      {message ? (
        <AdminAlert tone={message.ok ? "success" : "danger"}>{message.text}</AdminAlert>
      ) : null}

      {/* Upload form */}
      <AdminSection title="Upload Assets">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <label>
            <span className="label">Label</span>
            <input
              className="input"
              value={uploadLabel}
              onChange={(e) => setUploadLabel(e.target.value)}
              placeholder="e.g. Gluten Free"
              autoComplete="off"
            />
          </label>
          <label>
            <span className="label">Category</span>
            <select
              className="select"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as Category)}
            >
              {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span className="label">Tags (comma-separated)</span>
            <input
              className="input"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              placeholder="e.g. gluten free, wheat free, celiac"
              autoComplete="off"
            />
          </label>
        </div>
        <label className="btn btn--accent" style={{ cursor: "pointer", width: "max-content" }}>
          <I.Upload size={14} />
          {uploading ? "Uploading…" : "Choose Files"}
          <input
            hidden
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) void upload(e.target.files);
            }}
          />
        </label>
        <div className="hint" style={{ marginTop: 8 }}>
          Multi-file uploads share the category and tags. Labels auto-derive from filename; set label above to override for single uploads.
        </div>
      </AdminSection>

      {props.items.length === 0 ? (
        <AdminEmpty icon={<I.Image size={28} />} title="No Stock Assets Yet">
          Upload PNG, JPEG, WebP, or SVG assets to seed the library.
        </AdminEmpty>
      ) : (
        <AdminSection title="Assets" flush>
          {/* Tabs + search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "0 6px",
              flexWrap: "wrap",
            }}
          >
            <div className="tabs">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`tab${activeCategory === c.key ? " is-active" : ""}`}
                  onClick={() => setActiveCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <I.Search size={13} style={{ position: "absolute", left: 10, top: 10, color: "var(--fg-3)" }} />
              <input
                className="input"
                style={{ paddingLeft: 32, width: 220, fontSize: 13 }}
                placeholder="Search icons…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              No assets match.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
                padding: 16,
              }}
            >
              {filtered.map((item) => (
                <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {/* Thumbnail */}
                  <div
                    style={{
                      aspectRatio: "1/1",
                      background: "var(--cal-gray-100)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div
                        className="checker"
                        style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}
                      >
                        <I.Image size={20} style={{ color: "var(--fg-3)" }} />
                      </div>
                    )}
                    {/* Delete button */}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        padding: "4px 6px",
                        minHeight: "unset",
                      }}
                      aria-label={`Delete ${item.label}`}
                      onClick={() => void deleteItem(item.id)}
                    >
                      <I.Trash size={12} />
                    </button>
                  </div>

                  {/* Info / edit toggle */}
                  {editingId === item.id ? (
                    <div style={{ padding: "10px 12px", display: "grid", gap: 8 }}>
                      <input
                        className="input"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Label"
                        style={{ fontSize: 12 }}
                      />
                      <select
                        className="select"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as Category)}
                        style={{ fontSize: 12 }}
                      >
                        {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        className="input"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="tag1, tag2…"
                        style={{ fontSize: 12 }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={editSaving}
                          onClick={() => void saveEdit(item.id)}
                          style={{ flex: 1 }}
                        >
                          {editSaving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px 12px",
                        textAlign: "left",
                        background: "none",
                        border: 0,
                        cursor: "pointer",
                      }}
                      onClick={() => startEdit(item)}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>
                        {CATEGORIES.find((c) => c.key === item.category)?.label ?? item.category}
                      </div>
                      {item.tags.length > 0 ? (
                        <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 4 }}>
                          {item.tags.slice(0, 3).join(", ")}
                          {item.tags.length > 3 ? ` +${item.tags.length - 3}` : ""}
                        </div>
                      ) : null}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      )}
    </AdminPage>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @layertone/web typecheck
```
Expected: no errors.

- [ ] **Step 4: Manual smoke test**
- Open `/admin/stock` in browser
- Upload a PNG with label "Vegan", category "Food · Dietary", tags "vegan, plant-based"
- Confirm it appears in the grid with the label shown
- Click the card → edit panel opens
- Change the label → click Save → card updates
- Click the trash icon → card disappears

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/admin/stock-admin.tsx apps/web/app/admin/stock/page.tsx
git commit -m "feat(admin): stock library full rework — category tabs, search, upload form, delete, edit"
```

---

## Task 8: Web — generation types and page

**Files:**
- Modify: `apps/web/components/generate/commercial/types.ts`
- Modify: `apps/web/app/(app)/generate/page.tsx`

- [ ] **Step 1: Add `StockAssetLite` type and `stockAssetId` to `GenerateState` and `GeneratePayload`**

In `apps/web/components/generate/commercial/types.ts`:

Add after `MoodLite`:

```ts
export interface StockAssetLite {
  id: string;
  label: string;
  category: string;
  tags: string[];
  url: string | null;
}
```

Add `stockAssetId` to `GenerateState` (around line 174):

```ts
export interface GenerateState {
  // ... existing fields ...
  brandLogoAssetIds: string[];
  stockAssetId: string | null;   // ← add
}
```

Add `stockAssetId` to `GeneratePayload` (around line 238):

```ts
export type GeneratePayload = {
  // ... existing fields ...
  brandLogoAssetIds: string[];
  stockAssetId: string | null;   // ← add
};
```

- [ ] **Step 2: Update `generate/page.tsx` to fetch stock assets**

Open `apps/web/app/(app)/generate/page.tsx`. It currently passes `brands`, `moods`, `products` to the generate component. Add stock assets to the fetch:

```ts
// At the top of the page component, after other imports:
import { adminListStock } from "@layertone/db";
import { S3StorageAdapter } from "@layertone/storage";
```

Inside the page function, alongside other data fetches, add:

```ts
const config = loadConfig();
const storage = new S3StorageAdapter({
  region: config.storage.region,
  bucket: config.storage.bucketGlobal,
  forcePathStyle: config.storage.mode === "minio",
  ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
  ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
  ...(config.storage.secretAccessKey ? { secretAccessKey: config.storage.secretAccessKey } : {}),
});

const db = createDb(config.db.url, "app_user");
const rawStock = await adminListStock(db);
const stockAssets = await Promise.all(
  rawStock.map(async (item) => ({
    id: item.id,
    label: item.label,
    category: item.category,
    tags: item.tags,
    url: await storage.getSignedUrl(item.s3Key, 14400).catch(() => null),
  })),
);
```

Pass `stockAssets` to the generate component:
```ts
<GenerateComponent ... stockAssets={stockAssets} />
```

(Note: find the actual component name in the page — it may be `<Generate>` or similar. Pass `stockAssets` as a prop.)

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @layertone/web typecheck
```
Expected: no errors. Fix any prop type errors in the generate component chain.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/generate/commercial/types.ts apps/web/app/(app)/generate/page.tsx
git commit -m "feat(web): add StockAssetLite type, stockAssetId to GenerateState and payload"
```

---

## Task 9: Web — QuickCreate stock picker panel

**Files:**
- Modify: `apps/web/components/generate/commercial/quick-create.tsx`

- [ ] **Step 1: Add `stockAssets` prop and `stockAssetId` state wiring**

In `apps/web/components/generate/commercial/quick-create.tsx`, update the `QuickCreate` props interface to add:

```ts
export function QuickCreate(props: {
  state: GenerateState;
  // ... existing props ...
  stockAssets: StockAssetLite[];
  onStockAssetChange: (id: string | null) => void;
}) {
```

Import `StockAssetLite` at the top:
```ts
import type { ..., StockAssetLite } from "./types";
```

- [ ] **Step 2: Add the stock picker section JSX**

Add a new section in the `QuickCreate` return, after the Mood selector section. Use a `<details>` element for the collapsible behaviour:

```tsx
{/* Stock certification mark picker */}
{props.stockAssets.length > 0 ? (
  <details className="qc-stock-picker">
    <summary className="qc-stock-picker__summary">
      <I.Tag size={14} />
      <span>
        {props.state.stockAssetId
          ? `Certification mark · ${props.stockAssets.find((a) => a.id === props.state.stockAssetId)?.label ?? "Selected"}`
          : "Add certification mark"}
      </span>
      {props.state.stockAssetId ? (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          style={{ marginLeft: "auto", fontSize: 12 }}
          onClick={(e) => {
            e.preventDefault();
            props.onStockAssetChange(null);
          }}
        >
          Clear
        </button>
      ) : null}
    </summary>
    <StockPicker
      assets={props.stockAssets}
      selectedId={props.state.stockAssetId}
      onChange={props.onStockAssetChange}
    />
  </details>
) : null}
```

- [ ] **Step 3: Add the `StockPicker` sub-component**

Add this component to the same file (or extract to `stock-picker.tsx` — keep in same file for simplicity):

```tsx
type StockPickerCategory = "all" | "food-dietary" | "food-safety" | "cosmetics" | "manufacturing" | "wellness";

const PICKER_CATEGORIES: Array<{ key: StockPickerCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "food-dietary", label: "Dietary" },
  { key: "food-safety", label: "Safety" },
  { key: "cosmetics", label: "Cosmetics" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "wellness", label: "Wellness" },
];

function StockPicker({
  assets,
  selectedId,
  onChange,
}: {
  assets: StockAssetLite[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [category, setCategory] = React.useState<StockPickerCategory>("all");
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return assets.filter((a) => {
      const matchesCat = category === "all" || a.category === category;
      const matchesSearch =
        !q || a.label.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [assets, category, search]);

  return (
    <div className="qc-stock-picker__body">
      <div className="qc-stock-picker__controls">
        <input
          className="input"
          style={{ fontSize: 13 }}
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        <div className="tabs" style={{ flexWrap: "wrap", gap: 4 }}>
          {PICKER_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`tab${category === c.key ? " is-active" : ""}`}
              style={{ fontSize: 12, padding: "4px 10px" }}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="qc-stock-picker__grid">
        {filtered.map((asset) => {
          const isSelected = asset.id === selectedId;
          return (
            <button
              key={asset.id}
              type="button"
              className={`qc-stock-tile${isSelected ? " is-selected" : ""}`}
              onClick={() => onChange(isSelected ? null : asset.id)}
              aria-pressed={isSelected}
              title={asset.label}
            >
              <div className="qc-stock-tile__img">
                {asset.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <I.Image size={20} style={{ color: "var(--fg-3)" }} />
                )}
                {isSelected ? (
                  <div className="qc-stock-tile__check">
                    <I.Check size={12} />
                  </div>
                ) : null}
              </div>
              <span className="qc-stock-tile__label">{asset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add CSS for stock picker to `cal-layertone.css`**

Append to `apps/web/app/cal-layertone.css`:

```css
/* ---------- QuickCreate stock picker ---------- */
.qc-stock-picker {
  border: 1px solid var(--cal-gray-200);
  border-radius: 10px;
  background: var(--cal-white);
}

.qc-stock-picker__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-2);
  list-style: none;
  user-select: none;
}

.qc-stock-picker__summary::-webkit-details-marker { display: none; }

.qc-stock-picker__body {
  padding: 12px 14px 14px;
  border-top: 1px solid var(--cal-gray-100);
  display: grid;
  gap: 10px;
}

.qc-stock-picker__controls {
  display: grid;
  gap: 8px;
}

.qc-stock-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.qc-stock-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--cal-gray-50);
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.qc-stock-tile:hover {
  background: var(--cal-gray-100);
}

.qc-stock-tile.is-selected {
  border-color: var(--layertone-violet);
  background: var(--layertone-violet-50);
}

.qc-stock-tile__img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  display: grid;
  place-items: center;
  position: relative;
  background: var(--cal-white);
}

.qc-stock-tile__check {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(94, 92, 230, 0.72);
  color: white;
  border-radius: 6px;
}

.qc-stock-tile__label {
  font-size: 10px;
  line-height: 1.2;
  text-align: center;
  color: var(--fg-2);
  font-weight: 600;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 5: Wire `onStockAssetChange` in the parent generate component**

Find where `QuickCreate` is rendered (likely in `apps/web/components/generate/generate.tsx` or the page). Add the handler alongside `onMoodChange`:

```ts
onStockAssetChange={(id) =>
  setState((prev) => ({ ...prev, stockAssetId: id }))
}
```

Also initialise `stockAssetId: null` in the default state and include it in the payload submitted to the API:

In the submit/payload builder, add:
```ts
stockAssetId: state.stockAssetId,
```

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @layertone/web typecheck
```
Expected: no errors.

- [ ] **Step 7: Manual smoke test**
- Open `/generate`
- Confirm "Add certification mark" collapsible section appears below the Mood selector (only if stock assets exist)
- Click to expand — category tabs and grid appear
- Click an icon — violet ring appears, summary updates to "Certification mark · Vegan"
- Click "Clear" — selection removed
- Submit a generation — verify `stockAssetId` is in the network payload

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/generate/commercial/quick-create.tsx apps/web/app/cal-layertone.css
git commit -m "feat(web): add stock certification mark picker to QuickCreate"
```

---

## Task 10: Upload starter set icons

This is a manual content task, not a code task. It requires a designer to create and the admin to upload the 40 icons.

- [ ] **Step 1: Design the 40 starter icons**

Create SVG or high-res PNG icons (512×512 px recommended) for each item in the starter set defined in `docs/superpowers/specs/2026-05-28-stock-library-design.md` Section 2. All icons should follow a consistent visual style: clean, flat, badge-like, with clear symbolic representation of the concept. No trademarked logos.

- [ ] **Step 2: Upload via admin panel**

Log in to `/admin/stock`. For each icon:
- Set the label (e.g. "Vegan")
- Set the category (e.g. "food-dietary")
- Set the tags from the spec table (e.g. "vegan, plant-based, no animal products, cruelty free")
- Upload the file

Use batch upload for icons that share a category and tags.

- [ ] **Step 3: Verify in picker**

Open `/generate`, expand the certification mark picker, confirm all 40 icons appear across their categories.

---

## Self-Review Notes

- **Task 8, Step 2** references `adminListStock` imported from `@layertone/db` — this works because `adminListStock` is already exported from `packages/db/src/index.ts`. The generate page uses `app_user` role which has SELECT access via RLS policy.
- **Task 5** reads the existing `inspirationImageS3Key` back from the DB after the inspiration upload block — this requires the `generations` table to be in scope. The import `generations` from `@layertone/db` is already present in `generation.ts`.
- **Task 9, Step 5** — the exact state management and submit path depends on how `generate.tsx` currently manages state. Inspect the file before editing; the pattern follows exactly how `moodId` is handled.
- **Signed URL TTL in Task 8** uses 14400 seconds (4 hours) for the generation page vs 3600 elsewhere — this accounts for users who keep the tab open before generating.
