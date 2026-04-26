# Slice 38 — Brand setup wizard (6 steps)

**Phase:** 12 — Frontend onboarding
**Depends on:** 36, 14, 15
**Spec references:** [Spec § 3.2 (Brand setup wizard)](../specs/2026-04-25-studio-v1-spec.md), [UI Prompt 3](../specs/2026-04-25-studio-v1-ui-prompts.md).

**Definition of done:**
- `/onboarding/brand/[step]` route group with steps 1–6: Identify, Logo, Palette, Fonts, Voice, References
- Wizard state held in URL params + a tiny client-side store (Zustand or React `useState` with sessionStorage)
- Each step has a typed form (zod-react-hook-form), validates client-side, posts to `BrandApi`
- Finish → toast + redirect to `/generate`
- Skip controls on optional steps (5, 6)
- Component tests cover form validation per step

---

## Files

**Create:**
- `apps/web/src/app/onboarding/brand/layout.tsx`
- `apps/web/src/app/onboarding/brand/[step]/page.tsx`
- `apps/web/src/components/onboarding/{step-progress.tsx,step-1-identify.tsx,step-2-logo.tsx,step-3-palette.tsx,step-4-fonts.tsx,step-5-voice.tsx,step-6-references.tsx}`
- `apps/web/src/lib/onboarding/store.ts`
- `apps/web/src/lib/api/brand.ts` (typed client)
- API routes: `/api/brands` (POST, PATCH), `/api/brands/[id]/logo` (POST), `/api/brands/[id]/assets` (POST), `/api/extract-url` (POST)
- Tests for steps 1, 2 (validation)

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @studio/web add react-hook-form @hookform/resolvers zod zustand
```

- [ ] **Step 2 — Onboarding store**

```ts
// apps/web/src/lib/onboarding/store.ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface State {
  brandId?: string;
  name: string;
  sourceUrl?: string;
  logoUploaded: boolean;
  set: (patch: Partial<State>) => void;
  reset: () => void;
}

export const useOnboardingStore = create<State>()(persist((set) => ({
  name: "",
  logoUploaded: false,
  set: (patch) => set(patch),
  reset: () => set({ name: "", logoUploaded: false, brandId: undefined, sourceUrl: undefined }),
}), { name: "studio-onboarding" }));
```

- [ ] **Step 3 — Step 1: Identify**

```tsx
// apps/web/src/components/onboarding/step-1-identify.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/onboarding/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Schema = z.object({ name: z.string().min(1).max(120), sourceUrl: z.string().url().optional().or(z.literal("")) });
type Form = z.infer<typeof Schema>;

export function StepIdentify() {
  const router = useRouter();
  const store = useOnboardingStore();
  const form = useForm<Form>({ resolver: zodResolver(Schema), defaultValues: { name: store.name, sourceUrl: store.sourceUrl ?? "" } });

  const onSubmit = async (data: Form) => {
    const res = await fetch("/api/brands", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, sourceUrl: data.sourceUrl || undefined }) });
    const brand = await res.json();
    store.set({ name: data.name, sourceUrl: data.sourceUrl, brandId: brand.id });
    router.push("/onboarding/brand/2-logo");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Brand name</Label>
        <Input id="name" {...form.register("name")} aria-invalid={!!form.formState.errors.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">Your website URL <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="url" placeholder="https://example.com" {...form.register("sourceUrl")} />
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>Continue</Button>
    </form>
  );
}
```

- [ ] **Step 4 — Steps 2-6**

Each step renders a form, calls the corresponding API endpoint, advances router. Match UI Prompt 3:

- **Step 2 (Logo):** drag-and-drop file input → POST `/api/brands/[id]/logo` (multipart). Show preview on transparent grid.
- **Step 3 (Palette):** 3–5 color pickers (use `<input type="color" />` plus a hex input). "Suggest from logo" button calls `/api/brands/[id]/extract-palette` (use the URL extractor's color extraction or sharp).
- **Step 4 (Fonts):** two `Select` components rendering a curated list of ~50 Google Fonts (hardcoded list at `apps/web/lib/google-fonts.ts`). Each option renders the family name in its own face via Next/Font dynamic import.
- **Step 5 (Voice):** `<Textarea>` with maxlength 2000.
- **Step 6 (References):** drag-and-drop multi-file → uploads in parallel.

For each step, write a component test for form validation (required fields, max length).

- [ ] **Step 5 — API routes**

```ts
// apps/web/src/app/api/brands/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { BrandApi } from "@studio/api";
import { loadConfig, createAdapters } from "@studio/shared";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  const cfg = loadConfig(); const adapters = createAdapters(cfg);
  const api = new BrandApi(cfg, adapters);
  const body = await req.json();
  const brand = await api.create(session.workspaceId, body);
  return NextResponse.json(brand);
}
```

(Logo upload route uses `req.formData()`. Reference upload similar.)

- [ ] **Step 6 — Layout & step indicator**

```tsx
// apps/web/src/app/onboarding/brand/layout.tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container mx-auto max-w-xl py-12">
      <div className="rounded-xl border p-8 shadow-sm">{children}</div>
    </main>
  );
}
```

(Step page renders the right step component based on `[step]` param.)

- [ ] **Step 7 — Commit**

```bash
pnpm --filter @studio/web test
git add -A
git commit -m "feat(web): brand setup wizard (6 steps) with API integration"
```

---

## Verification

```bash
pnpm dev   # complete onboarding flow end-to-end with AUTH_MODE=dev
```

## Commit message

```
feat(web): brand setup wizard (6 steps) with API integration
```
