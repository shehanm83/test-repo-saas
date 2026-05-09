# Manual Crop Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Each task is sized for one focused subagent run; do not split further.

**Goal:** Add a user-driven crop & resize tool on the result page. Background image is preserved; output is recomposed inline at request time using Sharp.

**Spec:** `docs/superpowers/specs/2026-05-09-manual-crop-tool-design.md`
**Architecture:** Schema gains two columns on `generation_variants` (`recomposed_at`, `crop_region`). New endpoint `POST /api/generations/[id]/variants/[vid]/recompose` runs Sharp inline. New `<CropEditor>` client component wraps `react-image-crop`. No worker / SQS involvement — everything happens in the request handler.

**Tasks: 3 total.**

---

## Task D1: Schema, recompose service, recompose endpoint

**Files (create):**
- `packages/db/src/migrations/0021_variant_recompose.sql`
- `packages/api/src/recompose.ts` (new service module)
- `packages/api/src/recompose.test.ts`
- `apps/web/app/api/generations/[id]/variants/[vid]/recompose/route.ts`

**Files (modify):**
- `packages/db/src/schema/generation.ts` (add `recomposedAt`, `cropRegion` to `generationVariants`)
- `packages/db/src/migrations/meta/_journal.json` (idx 20 — assumes C's migration is 19)
- `packages/db/src/queries/variant.ts` if exists, else `generation.ts` queries (add `getVariantWithBackground(db, generationId, variantId)`)
- `packages/api/src/index.ts` (re-export RecomposeService)

**Migration `0021_variant_recompose.sql`:**
```sql
ALTER TABLE generation_variants
  ADD COLUMN recomposed_at timestamptz,
  ADD COLUMN crop_region jsonb;
```

**Drizzle schema (modify generation_variants definition):**
```typescript
recomposedAt: timestamp("recomposed_at", { withTimezone: true }),
cropRegion: jsonb("crop_region").$type<{ x: number; y: number; w: number; h: number; targetWidth: number; targetHeight: number }>(),
```

**`RecomposeService` (`packages/api/src/recompose.ts`):**
```typescript
import sharp from "sharp";
import { z } from "zod";
import { eq } from "drizzle-orm";

const RecomposeInput = z.object({
  crop: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0).max(1),
    h: z.number().min(0).max(1),
  }).refine((c) => c.x + c.w <= 1.001, "crop_outside_bounds")
    .refine((c) => c.y + c.h <= 1.001, "crop_outside_bounds"),
  targetWidth: z.number().int().min(256).max(4096),
  targetHeight: z.number().int().min(256).max(4096),
});

export class RecomposeService {
  constructor(private readonly config: Config, private readonly storage: StorageAdapter) {}

  async recomposeVariant(args: { workspaceId: string; generationId: string; variantId: string; input: unknown }) {
    const { crop, targetWidth, targetHeight } = RecomposeInput.parse(args.input);

    // Aspect parity check (1% tolerance)
    const cropAspect = crop.w / crop.h;
    const targetAspect = targetWidth / targetHeight;
    if (Math.abs(cropAspect - targetAspect) / targetAspect > 0.01) {
      throw new AppError(CODES.VALIDATION_FAILED, "aspect_mismatch", 422, { cropAspect, targetAspect });
    }

    // Load variant; ensure it has background_s3_key
    const v = await getVariantWithBackground(this.db(), args.generationId, args.variantId);
    if (!v) throw new AppError(CODES.NOT_FOUND, "variant_not_found", 404);
    if (v.status !== "completed") throw new AppError(CODES.VALIDATION_FAILED, "variant_not_completed", 422);
    if (!v.backgroundS3Key) throw new AppError(CODES.VALIDATION_FAILED, "variant_has_no_background", 422);

    // Pixel coords of crop on source
    const bgBytes = await this.storage.getBytes(v.backgroundS3Key);
    const meta = await sharp(bgBytes).metadata();
    if (!meta.width || !meta.height) throw new Error("background_metadata_missing");

    const px = {
      left: Math.round(crop.x * meta.width),
      top: Math.round(crop.y * meta.height),
      width: Math.round(crop.w * meta.width),
      height: Math.round(crop.h * meta.height),
    };

    const out = await sharp(bgBytes)
      .extract(px)
      .resize(targetWidth, targetHeight, { fit: "fill" })
      .png()
      .toBuffer();

    // Overwrite output_s3_key in place
    await this.storage.put(v.outputS3Key, out, "image/png");

    // Update row
    const recomposedAt = new Date();
    await this.db().update(generationVariants)
      .set({ recomposedAt, cropRegion: { ...crop, targetWidth, targetHeight } })
      .where(eq(generationVariants.id, args.variantId));

    const signedUrl = await this.storage.getSignedUrl(v.outputS3Key, 60 * 60);
    return { outputS3Key: v.outputS3Key, signedUrl, width: targetWidth, height: targetHeight, recomposedAt: recomposedAt.toISOString() };
  }
}
```

**Endpoint** (`apps/web/app/api/generations/[id]/variants/[vid]/recompose/route.ts`):
```typescript
import { NextResponse } from "next/server";
import { RecomposeService } from "@vyora/api/recompose";
import { loadConfig } from "@vyora/shared/config";
import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; vid: string }> },
) {
  const { id, vid } = await params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });

  const adapters = createServerAdapters();
  const service = new RecomposeService(loadConfig(), adapters.storage);
  try {
    const result = await service.recomposeVariant({
      workspaceId: session.workspaceId,
      generationId: id,
      variantId: vid,
      input: await request.json(),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: err.httpStatus });
    }
    throw err;
  }
}
```

Tests:
- Unit: mock storage + db; verify `RecomposeInput` validation, aspect-mismatch detection, sharp extract args computed from normalised crop are correct against a 1024×1024 fake background.
- Integration: real Postgres + MinIO. Submit a generation, complete its variant manually (or use a fixture), call recompose, fetch the resulting object from MinIO, verify dimensions.

Run migration, run tests, commit:
```
git commit -m "feat(api): variant recompose service + endpoint + schema"
```

Verify: `pnpm --filter @vyora/api --filter @vyora/db test` green; integration test produces a 1280×720 PNG in MinIO.

---

## Task D2: Crop editor UI on the result page

**Files (create):**
- `apps/web/components/generations/crop-editor.tsx` (~250 lines including JSX)
- `apps/web/components/generations/crop-editor.test.tsx`

**Files (modify):**
- `apps/web/components/generations/variant-card.tsx` (or wherever the variant card lives — find via grep) — add the **Crop & Resize** button + state to expand into the editor
- `apps/web/app/(app)/generations/[id]/page.tsx` (server component — when fetching variants, also fetch the `use_case_code` from the generation's settings + the matching use_case row to know the target W×H to lock the aspect)

**Install dependency:**
```bash
pnpm add -F @vyora/web react-image-crop@^11.0.0
```

**`<CropEditor>` component** — accepts `{ variant, generation, useCase, onApplied, onCancel }`. State: `{ crop: PercentCrop, locked: boolean, applying: boolean, error: string | null }`. Default crop is centred at the use-case's aspect, sized to fill either width or height of the source.

Render layout:
```tsx
<div className="crop-editor">
  <div className="crop-editor__source">
    <ReactCrop
      crop={crop}
      onChange={(_, p) => setCrop(p)}
      aspect={locked ? targetAspect : undefined}
      keepSelection
    >
      <img src={backgroundSignedUrl} alt="" onLoad={(e) => initialiseCrop(e.currentTarget)} />
    </ReactCrop>
    <label>
      <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
      Lock to {useCase.label} aspect ({useCase.aspectRatio})
    </label>
  </div>
  <div className="crop-editor__preview">
    <h4>Preview at {targetWidth}×{targetHeight}</h4>
    <CssCroppedImage src={backgroundSignedUrl} crop={crop} target={{ w: targetWidth, h: targetHeight }} />
    <button className="btn btn--accent" disabled={applying} onClick={apply}>
      {applying ? "Applying…" : "Apply crop"}
    </button>
    <button className="btn btn--secondary" onClick={onCancel}>Cancel</button>
    {error && <p className="crop-editor__error">{error}</p>}
  </div>
</div>
```

`apply()` POSTs to `/api/generations/[id]/variants/[vid]/recompose` with `crop` normalised to 0..1, plus `targetWidth/targetHeight` (from use_case unless `locked=false` in which case from a custom W×H input). On 200, calls `onApplied(result)` so the parent can swap the variant's signed URL.

The variant card grows a "Crop & Resize" button next to "Download" — only visible when `variant.status === "completed"` AND `variant.backgroundS3Key` is non-null (legacy variants without background show a tooltip per the spec). Click toggles between displaying the variant image and the `<CropEditor>` inline within the card's container (no modal — keeps the rest of the result page in view).

Render test: render with a fixture variant; assert the editor mounts, the Apply button calls fetch with a normalised crop body, and a 200 response triggers `onApplied`.

Commit:
```
git commit -m "feat(generations): manual crop & resize editor on variant cards"
```

Verify: `pnpm --filter @vyora/web typecheck` clean; `pnpm --filter @vyora/web test` green; manually clicking through a result page in the browser produces a working crop interaction.

---

## Task D3: Wire the C → D fallback + smoke + storage strategy verification

**Files (modify):**
- `apps/web/components/generate/quick-create-wizard.tsx` (the "Generate at native size and crop later" CTA from C3 sets a flag that the result page reads to auto-open the crop editor on the first variant)
- `apps/web/app/(app)/generations/[id]/page.tsx` (read the flag, expand the first variant's crop editor on initial render)
- `docs/PRODUCTION_GAPS.md` (mark crop-pain entry resolved if tracked there; also note that legacy variants without `background_s3_key` cannot be cropped — this is documented behaviour, not a gap)

The wire-up: when the user selected "Generate at native size and crop later" in C's step 3, the wizard adds `?cropFirst=1` to the result-page navigation. The result page reads the query param via `useSearchParams` and, after variants load, calls `setActiveCropEditor(firstCompletedVariant.id)` to open D2's editor automatically. No new API; pure client-side handoff.

**Smoke** (manual + tsx):
1. Generate a FB Landscape (1.91:1) at Photoreal Pro's native 1536×1024 (3:2). Wait for completion.
2. Click "Crop & Resize". Aspect lock should be on by default at 1.91:1. Drag the crop rectangle to a non-centred region. Click Apply.
3. After ~1-2 seconds, the variant image refreshes to the cropped output. `output_s3_key` is the same key (overwritten); `generation_variants.recomposed_at` is set; `generation_variants.crop_region` matches what was sent.
4. Click "Crop & Resize" again. The editor opens with the previous crop pre-loaded (from `crop_region`). Choose a different region. Apply. Verify the second crop replaces the first.
5. Find a legacy variant (one without `background_s3_key` — there should be at least one from before sub-project A's pipeline). Verify the Crop button is hidden / shows the explanatory tooltip.

**Storage verification:**
- `background_s3_key` is unchanged after both crops in step 3-4 (use `aws s3api head-object` or the MinIO console to inspect).
- `output_s3_key` content changed after each crop (confirm via byte comparison).

Commit (single combined commit for the wire-up + smoke notes + doc update):
```
git commit -m "feat(generations): result page consumes ?cropFirst=1; gap doc updated"
```

Verify: `git log master..HEAD` shows 3 commits for sub-project D; smoke checks 1-5 pass.

---

## What's NOT in this plan

- Versioned output storage (overwrite-in-place per spec § 5)
- Smart / face-aware crop suggestions
- Cropping reference / inspiration uploads
- Bulk crop across multiple variants in one action
- Mobile gesture optimisation beyond what react-image-crop ships
