# Slice 41 — Brand kit editor + history list

**Phase:** 14 — Frontend brand/history/moods/billing
**Depends on:** 36, 14
**Spec references:** [UI Prompts 7 (brand editor) + 8 (history)](../specs/2026-04-25-studio-v1-ui-prompts.md).

**Definition of done:**
- `/brands/[id]` page renders a brand-edit page with Colors / Fonts / Voice / References / Danger Zone tabs
- All edits autosave on blur (PATCH `/api/brands/[id]`)
- "Delete brand" requires typing the brand name to confirm; cascade-delete via API endpoint
- `/history` page lists generations with thumbnail mosaic, brief snippet, badges, status, timestamp; click → results page
- Filter bar: brand selector / mood filter / status / date range; full-text search via `LIKE` on briefs

---

## Files

**Create:**
- `apps/web/src/app/(app)/brands/[id]/page.tsx`
- `apps/web/src/app/(app)/brands/page.tsx` (list)
- `apps/web/src/components/brand/{header-card.tsx,colors-tab.tsx,fonts-tab.tsx,voice-tab.tsx,references-tab.tsx,danger-zone.tsx}`
- `apps/web/src/app/(app)/history/page.tsx`
- `apps/web/src/components/history/{filter-bar.tsx,row.tsx}`
- API route `/api/brands/[id]/delete` (POST)
- API route `/api/history` (GET — supports filters)
- Tests for filter-bar + danger-zone

---

## Tasks

(High-level — implement per UI Prompts 7 and 8 with shadcn primitives.)

- [ ] **Step 1 — Brand list page** (`/brands`) — grid of brand cards with logo + name + asset count.

- [ ] **Step 2 — Brand editor page** with `<Tabs>` for the five tabs.

  - **Header card**: logo preview (with checkered transparency background via CSS), brand name editable inline, source URL, meta on the right.
  - **Colors tab**: row of swatches, click to edit via `<input type="color">`. Add/remove buttons. Live preview card.
  - **Fonts tab**: render heading + body in actual face. "Change font" opens dropdown with the curated Google Fonts list.
  - **Voice tab**: textarea editable inline; PATCH on blur.
  - **References tab**: grid of thumbs; modal preview with delete; drag-drop add.
  - **Danger zone**: confirm delete with name typing.

- [ ] **Step 3 — History list**

```tsx
// apps/web/src/app/(app)/history/page.tsx
"use client";
import { useEffect, useState } from "react";
import { FilterBar } from "@/components/history/filter-bar";
import { HistoryRow } from "@/components/history/row";

export default function HistoryPage() {
  const [items, setItems] = useState<unknown[]>([]);
  const [filters, setFilters] = useState({ brandId: "", moodId: "", status: "", q: "" });

  useEffect(() => {
    const params = new URLSearchParams(filters as never);
    fetch(`/api/history?${params}`).then((r) => r.json()).then(setItems);
  }, [filters]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">History</h1>
      <FilterBar value={filters} onChange={setFilters} />
      <ul className="divide-y rounded-md border">
        {items.map((it) => <HistoryRow key={(it as { id: string }).id} item={it as never} />)}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4 — `/api/history` route**

```ts
// apps/web/src/app/api/history/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { createDb, generations, generationVariants } from "@studio/db";
import { withWorkspace } from "@studio/db";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { loadConfig } from "@studio/shared";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.workspaceId) return NextResponse.json([], { status: 200 });
  const db = createDb(loadConfig().db.url, "app_user");
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const brandId = url.searchParams.get("brandId");
  const moodId = url.searchParams.get("moodId");
  const status = url.searchParams.get("status");

  return NextResponse.json(
    await withWorkspace(db, session.workspaceId, async (tx) => {
      const conds = [] as ReturnType<typeof eq>[];
      if (q) conds.push(ilike(generations.brief, `%${q}%`));
      if (brandId) conds.push(eq(generations.brandId, brandId));
      if (moodId) conds.push(eq(generations.moodId, moodId));
      if (status) conds.push(eq(generations.status, status as never));

      const rows = await tx.select().from(generations).where(and(...conds)).orderBy(desc(generations.createdAt)).limit(100);
      // Hydrate variants for thumbnails
      const variants = await tx.select().from(generationVariants);
      const grouped = new Map<string, typeof variants>();
      for (const v of variants) {
        const arr = grouped.get(v.generationId) ?? [];
        arr.push(v);
        grouped.set(v.generationId, arr);
      }
      return rows.map((r) => ({ ...r, variants: grouped.get(r.id) ?? [] }));
    }),
  );
}
```

- [ ] **Step 5 — Tests + commit**

```bash
pnpm --filter @studio/web test
git add -A
git commit -m "feat(web): brand kit editor (5 tabs) and history list with filters/search"
```

---

## Verification

```bash
pnpm dev   # navigate /brands, /brands/[id], /history
```

## Commit message

```
feat(web): brand kit editor (5 tabs) and history list with filters/search
```
