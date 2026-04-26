# Slice 39 — Generation form

**Phase:** 13 — Frontend generation
**Depends on:** 36, 27, 28, 29
**Spec references:** [UI Prompt 5 — Generation form (with output target picker + inspiration upload)](../specs/2026-04-25-studio-v1-ui-prompts.md), [Spec § 3.3](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `/generate` route renders the split-view form per UI Prompt 5
- Order: Output target picker → Brief → Inspiration upload (optional, with influence slider) → Brand selector → Aspect ratio (only if Just-an-image) → Mood picker → Submit (with live cost estimate)
- Right panel: brand toggles + mood toggles + premium model toggle (Pro+ only)
- Submit calls `POST /api/generations`, redirects to `/generations/[id]`
- Cost estimate updates live (client-side calculation using TOPUP-cost-table mirrored from server, or server-driven via debounced `POST /api/generations/estimate`)
- Inspiration upload calls `POST /api/uploads/inspiration` and shows thumbnail
- Component tests cover: output-target switching toggles aspect-ratio visibility; submit disabled when brief empty; submit disabled when "social" picked but no platform/format chosen

---

## Files

**Create:**
- `apps/web/src/app/(app)/generate/page.tsx`
- `apps/web/src/components/generate/{output-target-picker.tsx,brief-field.tsx,inspiration-upload.tsx,brand-pill.tsx,mood-strip.tsx,toggles-panel.tsx,submit-bar.tsx}`
- API routes: `/api/generations` (POST), `/api/generations/estimate` (POST), `/api/uploads/inspiration` (POST), `/api/moods/available` (GET), `/api/brands` (GET — re-use)
- Tests for output-target-picker + submit-bar

---

## Tasks

- [ ] **Step 1 — Output target picker component**

```tsx
// apps/web/src/components/generate/output-target-picker.tsx
"use client";
import { useState } from "react";
import { PLATFORM_FORMATS } from "@studio/shared";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type OutputTargetValue =
  | { kind: "social"; platform: string; format: string }
  | { kind: "image"; aspectRatio: "1:1" | "4:5" | "9:16" | "16:9" };

export function OutputTargetPicker({ value, onChange }: { value: OutputTargetValue; onChange: (v: OutputTargetValue) => void }) {
  return (
    <div className="space-y-3">
      <Tabs value={value.kind} onValueChange={(k) => {
        if (k === "social") onChange({ kind: "social", platform: "instagram", format: "post" });
        else onChange({ kind: "image", aspectRatio: "1:1" });
      }}>
        <TabsList>
          <TabsTrigger value="social">For social</TabsTrigger>
          <TabsTrigger value="image">Just an image</TabsTrigger>
        </TabsList>
      </Tabs>

      {value.kind === "social" && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {PLATFORM_FORMATS.map((p) => (
            <button key={`${p.platform}-${p.format}`}
              onClick={() => onChange({ kind: "social", platform: p.platform, format: p.format })}
              className={cn("rounded-md border px-3 py-2 text-sm",
                value.kind === "social" && value.platform === p.platform && value.format === p.format
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-muted",
              )}>
              <div className="font-medium capitalize">{p.platform}</div>
              <div className="text-xs text-muted-foreground">{p.label} · {p.width}×{p.height}</div>
            </button>
          ))}
        </div>
      )}

      {value.kind === "image" && (
        <div className="flex gap-2">
          {(["1:1","4:5","9:16","16:9"] as const).map((ar) => (
            <button key={ar}
              onClick={() => onChange({ kind: "image", aspectRatio: ar })}
              className={cn("rounded-md border px-3 py-2 text-sm", value.aspectRatio === ar ? "border-primary bg-accent" : "border-border hover:bg-muted")}>
              {ar}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 — Inspiration upload**

```tsx
// apps/web/src/components/generate/inspiration-upload.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function InspirationUpload({
  onUploaded,
}: {
  onUploaded: (state: { uploadId: string; previewUrl: string; influence: "subtle"|"balanced"|"strong" } | null) => void;
}) {
  const [state, setState] = useState<null | { uploadId: string; previewUrl: string; influence: "subtle"|"balanced"|"strong" }>(null);

  const onPick = async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/uploads/inspiration", { method: "POST", body: fd });
    const out = await r.json();
    const next = { uploadId: out.uploadId, previewUrl: URL.createObjectURL(file), influence: "balanced" as const };
    setState(next);
    onUploaded(next);
  };

  if (!state) {
    return (
      <label className="block cursor-pointer rounded-md border-2 border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted">
        Drop an inspiration image (used only for this generation)
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
      </label>
    );
  }

  const setInfluence = (i: "subtle"|"balanced"|"strong") => {
    const next = { ...state, influence: i }; setState(next); onUploaded(next);
  };

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <img src={state.previewUrl} alt="" className="h-16 w-16 rounded object-cover" />
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">Influence</div>
        <div className="mt-1 flex gap-2">
          {(["subtle","balanced","strong"] as const).map((v) => (
            <button key={v} onClick={() => setInfluence(v)}
              className={`rounded-md border px-3 py-1 text-xs ${state.influence === v ? "border-primary bg-accent" : "border-border"}`}>{v}</button>
          ))}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => { setState(null); onUploaded(null); }}>×</Button>
    </div>
  );
}
```

- [ ] **Step 3 — Other components**

(BriefField, BrandPill, MoodStrip, TogglesPanel, SubmitBar — implement per UI Prompt 5. Each is a small presentational component; the page stitches them together.)

- [ ] **Step 4 — Generate page**

```tsx
// apps/web/src/app/(app)/generate/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { OutputTargetPicker, type OutputTargetValue } from "@/components/generate/output-target-picker";
import { InspirationUpload } from "@/components/generate/inspiration-upload";
// ... other imports

export default function GeneratePage() {
  const router = useRouter();
  const [target, setTarget] = useState<OutputTargetValue>({ kind: "social", platform: "instagram", format: "post" });
  const [brief, setBrief] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [moodId, setMoodId] = useState<string | null>(null);
  const [insp, setInsp] = useState<{ uploadId: string; influence: "subtle"|"balanced"|"strong" } | null>(null);
  const [flags, setFlags] = useState({ /* defaults all true */ } as Record<string, boolean>);
  const [estimate, setEstimate] = useState<{ credits: number } | null>(null);

  const submit = async () => {
    const r = await fetch("/api/generations", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandId, moodId,
        brief,
        outputTarget: target,
        inspirationUploadId: insp?.uploadId,
        inspirationInfluence: insp?.influence,
        flags,
      })});
    const out = await r.json();
    if (r.status >= 400) { /* show toast */ return; }
    router.push(`/generations/${out.generationId}`);
  };

  // ... live estimate via debounced fetch to /api/generations/estimate

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-7 space-y-6">
        <OutputTargetPicker value={target} onChange={setTarget} />
        {/* BriefField, InspirationUpload, BrandPill, MoodStrip, SubmitBar */}
      </div>
      <aside className="col-span-5">{/* TogglesPanel + estimate */}</aside>
    </div>
  );
}
```

- [ ] **Step 5 — API routes**

```ts
// apps/web/src/app/api/generations/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { GenerationApi } from "@studio/api";
import { PricebookApi } from "@studio/api";
import { loadConfig, createAdapters } from "@studio/shared";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  const cfg = loadConfig(); const adapters = createAdapters(cfg);
  const pricebook = new PricebookApi(cfg);
  const api = new GenerationApi(cfg, adapters, { lookup: pricebook.lookup.bind(pricebook) });
  try {
    const body = await req.json();
    const out = await api.create({ workspaceId: session.workspaceId, userId: session.userId, input: body });
    return NextResponse.json(out);
  } catch (e) {
    const status = (e as { httpStatus?: number }).httpStatus ?? 400;
    const code = (e as { code?: string }).code ?? "validation.failed";
    return NextResponse.json({ error: { code, message: (e as Error).message } }, { status });
  }
}
```

(Estimate route just calls `pricebook.lookup` for each chosen template — wire similarly without reservation.)

- [ ] **Step 6 — Tests**

```tsx
// apps/web/src/components/generate/output-target-picker.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OutputTargetPicker } from "./output-target-picker";

describe("OutputTargetPicker", () => {
  it("switches to image mode and exposes aspect ratios", () => {
    const onChange = vi.fn();
    const { rerender } = render(<OutputTargetPicker value={{ kind: "social", platform: "instagram", format: "post" }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Just an image" }));
    expect(onChange).toHaveBeenCalledWith({ kind: "image", aspectRatio: "1:1" });

    rerender(<OutputTargetPicker value={{ kind: "image", aspectRatio: "1:1" }} onChange={onChange} />);
    expect(screen.getByText("4:5")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7 — Commit**

```bash
pnpm --filter @studio/web test
git add -A
git commit -m "feat(web): generation form (output target + inspiration + brief + brand + mood + toggles)"
```

---

## Verification

```bash
pnpm dev   # full submission flow with AI_MODE=mock
```

## Commit message

```
feat(web): generation form (output target + inspiration + brief + brand + mood + toggles)
```
