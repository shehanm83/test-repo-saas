# Slice 40 — Generation results page

**Phase:** 13 — Frontend generation
**Depends on:** 39, 31
**Spec references:** [UI Prompt 6 — Generation results](../specs/2026-04-25-studio-v1-ui-prompts.md), [Spec § 3.3 step 5 (long-poll status)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `/generations/[id]` page long-polls `GET /api/generations/[id]` every 1.5s until all variants terminal
- 2x2 grid of variant cards, each with skeleton/animated/failed/completed states
- Edit-text drawer (slide-from-right) lets user edit headline/subhead/CTA and re-render via `POST /api/generations/[id]/variants/[vid]/render` (free)
- Regenerate variant button calls `POST /api/generations/[id]/variants/[vid]/regenerate` (charged)
- Download / copy URL buttons
- Caption modal: pick length tier, calls `POST /api/captions`, polls `GET /api/captions/[jobId]`, shows result inline

---

## Files

**Create:**
- `apps/web/src/app/(app)/generations/[id]/page.tsx`
- `apps/web/src/components/results/{variant-card.tsx,edit-text-drawer.tsx,caption-modal.tsx}`
- `apps/web/src/lib/api/generations.ts`
- API routes: `/api/generations/[id]/route.ts` (GET), `/api/generations/[id]/variants/[vid]/render` (POST — free re-render), `/api/generations/[id]/variants/[vid]/regenerate` (POST — paid), `/api/captions` (POST), `/api/captions/[id]` (GET)

---

## Tasks

- [ ] **Step 1 — Status long-poll hook**

```ts
// apps/web/src/lib/api/generations.ts
import { useEffect, useState } from "react";

export interface VariantState {
  id: string; status: "queued"|"running"|"completed"|"failed"|"failed_safety";
  url?: string | null; modelUsed?: string | null; templateId: string;
}
export interface GenerationState {
  id: string; status: "pending"|"running"|"completed"|"failed";
  variants: VariantState[];
  brief: string; settings: { output_target: { aspectRatio: string; width: number; height: number } };
}

export function useGenerationStatus(id: string) {
  const [state, setState] = useState<GenerationState | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const r = await fetch(`/api/generations/${id}`);
      const out = await r.json() as GenerationState;
      if (!cancelled) setState(out);
      if (!cancelled && out.status !== "completed" && out.status !== "failed") {
        setTimeout(tick, 1500);
      }
    };
    void tick();
    return () => { cancelled = true; };
  }, [id]);
  return state;
}
```

- [ ] **Step 2 — Variant card**

```tsx
// apps/web/src/components/results/variant-card.tsx
"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, RefreshCcw, Type as TypeIcon, Link2, AlertTriangle } from "lucide-react";

export function VariantCard({ v, onEditText, onRegenerate }: { v: VariantState; onEditText: () => void; onRegenerate: () => void }) {
  if (v.status === "queued" || v.status === "running") return <Skeleton className="aspect-square w-full rounded-lg" />;
  if (v.status === "failed" || v.status === "failed_safety") {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
        <AlertTriangle className="mr-2 h-4 w-4" /> Variant failed
        <Button onClick={onRegenerate} variant="link">Try again</Button>
      </div>
    );
  }
  return (
    <div className="group relative overflow-hidden rounded-lg border">
      <img src={v.url ?? ""} alt="" className="block aspect-square w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
        <Button size="icon" variant="secondary" onClick={() => v.url && navigator.clipboard.writeText(v.url)}><Link2 className="h-4 w-4" /></Button>
        <Button size="icon" variant="secondary" onClick={onEditText}><TypeIcon className="h-4 w-4" /></Button>
        <Button size="icon" variant="secondary" onClick={onRegenerate}><RefreshCcw className="h-4 w-4" /></Button>
        <Button size="icon" asChild variant="secondary">
          <a href={v.url ?? "#"} download><Download className="h-4 w-4" /></a>
        </Button>
      </div>
      <div className="flex items-center gap-2 border-t p-2 text-xs text-muted-foreground">
        <span>{v.modelUsed}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 — Page**

```tsx
// apps/web/src/app/(app)/generations/[id]/page.tsx
"use client";
import { use, useState } from "react";
import { useGenerationStatus } from "@/lib/api/generations";
import { VariantCard } from "@/components/results/variant-card";
import { EditTextDrawer } from "@/components/results/edit-text-drawer";
import { CaptionModal } from "@/components/results/caption-modal";
import { Button } from "@/components/ui/button";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const state = useGenerationStatus(id);
  const [editing, setEditing] = useState<string | null>(null);
  const [captionFor, setCaptionFor] = useState<string | null>(null);

  if (!state) return <div className="p-6">Loading...</div>;
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{state.brief.slice(0, 80)}...</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs">
          {state.variants.filter((v) => v.status === "completed").length} of {state.variants.length} ready
        </span>
      </header>
      <div className="grid grid-cols-2 gap-4">
        {state.variants.map((v) => (
          <VariantCard key={v.id} v={v} onEditText={() => setEditing(v.id)} onRegenerate={() => fetch(`/api/generations/${id}/variants/${v.id}/regenerate`, { method: "POST" })} />
        ))}
      </div>
      <footer className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setCaptionFor(state.id)}>Add caption</Button>
        <Button>Generate variations</Button>
      </footer>
      {editing && <EditTextDrawer generationId={id} variantId={editing} onClose={() => setEditing(null)} />}
      {captionFor && <CaptionModal generationId={captionFor} onClose={() => setCaptionFor(null)} />}
    </div>
  );
}
```

- [ ] **Step 4 — Edit text drawer**

Drawer with `headline`, `subhead`, `cta` text inputs; "Re-render" button calls `POST /api/generations/[id]/variants/[vid]/render` with new slot values; this endpoint re-invokes the renderer using the existing background (no AI call, no credit cost). Updates the `output_s3_key` on the variant.

- [ ] **Step 5 — Caption modal**

Modal with three buttons (Short/Medium/Long with credit cost). On click, calls `POST /api/captions`, then polls `GET /api/captions/[id]` until `status='completed'`, shows the rendered text below the modal.

- [ ] **Step 6 — API routes**

Implement the 5 routes listed above using `GenerationApi`, `CaptionApi`, and the renderer for free re-renders.

- [ ] **Step 7 — Commit**

```bash
pnpm --filter @studio/web test
git add -A
git commit -m "feat(web): generation results page with long-poll, variant edit-text, regenerate, caption modal"
```

---

## Verification

```bash
pnpm dev   # complete generation roundtrip with AI_MODE=mock
```

## Commit message

```
feat(web): generation results page with long-poll, variant edit-text, regenerate, caption modal
```
