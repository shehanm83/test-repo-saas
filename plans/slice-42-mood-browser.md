# Slice 42 — Mood browser

**Phase:** 14 — Frontend brand/history/moods/billing
**Depends on:** 36, 16
**Spec references:** [UI Prompt 9 — Mood browser](../specs/2026-04-25-studio-v1-ui-prompts.md).

**Definition of done:**
- `/moods` page shows all available + upcoming moods grouped: Right Now / Always / Coming Soon
- Tabs (All / each group), search input filters by name + tags
- Click a card → returns to `/generate` with the mood pre-selected (query param)
- Optional filter rail (aspect-ratio support, accent colors)
- Visual quality matches the magazine-cover-wall vibe per UI Prompt 9

---

## Files

**Create:**
- `apps/web/src/app/(app)/moods/page.tsx`
- `apps/web/src/components/moods/{mood-card.tsx,filter-rail.tsx}`
- `apps/web/src/lib/api/moods.ts` (typed client)
- API route `/api/moods/all` (GET, includes upcoming) [/api/moods/available already exists from slice 39]

---

## Tasks

- [ ] **Step 1 — `/api/moods/all` route**

Returns moods with status='published', grouped by `validity` heuristic:
- `right_now`: validity window covers today
- `always`: kind='evergreen'
- `coming_soon`: validFrom > now and within 30 days

(Server queries the DB directly; reuse `MoodApi.adminList` is admin-only — instead create a new `listMoodsForBrowse`.)

- [ ] **Step 2 — Mood card**

```tsx
// apps/web/src/components/moods/mood-card.tsx
"use client";
import Link from "next/link";

export function MoodCard({ mood }: { mood: { id: string; slug: string; name: string; kind: "seasonal"|"evergreen"; previewS3Key?: string; validFrom?: string; validTo?: string } }) {
  const previewUrl = mood.previewS3Key ? `/api/preview?key=${encodeURIComponent(mood.previewS3Key)}` : "/placeholder.png";
  return (
    <Link href={`/generate?moodId=${mood.id}`} className="group rounded-lg border bg-card p-3 transition hover:shadow-md">
      <div className="aspect-square overflow-hidden rounded-md bg-muted">
        <img src={previewUrl} alt={mood.name} className="h-full w-full object-cover transition group-hover:scale-105" />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">{mood.name}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {mood.kind}
        </span>
      </div>
      {mood.validFrom && (
        <p className="text-xs text-muted-foreground">Available {new Date(mood.validFrom).toLocaleDateString()}</p>
      )}
    </Link>
  );
}
```

- [ ] **Step 3 — Browser page**

```tsx
// apps/web/src/app/(app)/moods/page.tsx
"use client";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { MoodCard } from "@/components/moods/mood-card";

interface Mood { id: string; slug: string; name: string; kind: "seasonal"|"evergreen"; previewS3Key?: string; validFrom?: string; validTo?: string }

export default function MoodsPage() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ rightNow: Mood[]; always: Mood[]; comingSoon: Mood[] } | null>(null);

  useEffect(() => { fetch("/api/moods/all").then((r) => r.json()).then(setData); }, []);
  if (!data) return <div className="p-6">Loading...</div>;

  const filter = (xs: Mood[]) => xs.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  const groups =
    tab === "rightnow" ? [{ title: "Right now", items: filter(data.rightNow) }] :
    tab === "always"   ? [{ title: "Always",    items: filter(data.always) }] :
    tab === "comingsoon" ? [{ title: "Coming soon", items: filter(data.comingSoon) }] :
    [
      { title: "Right now", items: filter(data.rightNow) },
      { title: "Always",    items: filter(data.always) },
      { title: "Coming soon", items: filter(data.comingSoon) },
    ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Moods</h1>
        <Input className="w-64" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="rightnow">Right now</TabsTrigger>
          <TabsTrigger value="always">Always</TabsTrigger>
          <TabsTrigger value="comingsoon">Coming soon</TabsTrigger>
        </TabsList>
      </Tabs>
      {groups.map((g) => (
        <section key={g.title} className="space-y-3">
          {g.items.length > 0 && <h2 className="text-sm font-medium text-muted-foreground">{g.title}</h2>}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {g.items.map((m) => <MoodCard key={m.id} mood={m} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4 — `GET /api/moods/all`**

```ts
import { NextResponse } from "next/server";
import { createDb, moods } from "@studio/db";
import { and, eq, gt, lt, isNotNull, isNull, or } from "drizzle-orm";
import { loadConfig } from "@studio/shared";

export async function GET() {
  const db = createDb(loadConfig().db.url, "app_user");
  const all = await db.select().from(moods).where(eq(moods.status, "published"));
  const now = new Date();
  const inWindow = (m: typeof all[number]) =>
    (!m.validFrom || m.validFrom <= now) && (!m.validTo || m.validTo >= now);

  const rightNow = all.filter((m) => m.kind === "seasonal" && inWindow(m));
  const always = all.filter((m) => m.kind === "evergreen");
  const comingSoon = all.filter((m) => m.kind === "seasonal" && m.validFrom && m.validFrom > now);
  return NextResponse.json({ rightNow, always, comingSoon });
}
```

- [ ] **Step 5 — Commit**

```bash
pnpm --filter @studio/web test
git add -A
git commit -m "feat(web): mood browser page with filtering and grouping"
```

---

## Verification

```bash
pnpm dev   # /moods loads and grouped sections render
```

## Commit message

```
feat(web): mood browser page with filtering and grouping
```
