# Manual Crop Tool — Design (Sub-project D)

**Date:** 2026-05-09
**Sub-project:** D (depends on A: taxonomy; depends on C: Quick Create wizard's "no native match" fallback)
**Goal:** Let users open an interactive crop selector on a completed variant — choose a region of the AI-generated background, and recompose at the use-case's target dimensions. The crop is *user-driven*; the system never applies a default crop on its own.

## 1. Scope

In:
- React-image-crop overlay on each completed variant card on the result page
- Aspect-ratio lock (default = the use-case's target aspect; user can unlock to free-form)
- Recompose endpoint that re-runs the renderer with the user-selected crop region
- Recompose either inline (synchronous, fast for single-variant) or queued (worker job for batch)
- Storage: keep the original `background_s3_key` untouched; overwrite or version `output_s3_key`

Out:
- Multi-step crop history / undo (one crop replaces previous)
- Programmatic crop hints from the AI (e.g., "important content is here") — pure user-driven
- Cropping AI-generated *output* images that don't have a `background_s3_key` (legacy variants from before A's pipeline)
- Adjustments beyond crop (no rotate, no filters, no exposure)

## 2. UX

On a result-page variant card with status `completed`:

```
┌─────────────────────────────┐
│       [variant image]        │
│                              │
│ photoreal-pro · 1280×720     │
│ [Download]  [Crop & Resize]  │
└─────────────────────────────┘
```

Clicking **Crop & Resize**:
1. The card expands into a side-by-side editor: left = `<ReactCrop>` over the **uncropped background image** (from `background_s3_key`), right = preview at the target use-case dimensions.
2. Default crop: aspect-locked to the use-case's `aspect_ratio`, centred, sized to fit either width or height of the source.
3. User drags / resizes the crop rectangle. Aspect lock can be toggled off; if off, the recompose runs at the user-chosen W×H instead of the use-case's.
4. **Apply** button POSTs the crop region to the recompose endpoint. UI shows a spinner; on success, the variant's `output_s3_key` is updated, the original variant card refreshes, and the editor closes.
5. **Cancel** discards the selection and closes the editor.

A small "Reset to model native" button reverts the variant to the AI's full-frame output (re-runs the renderer with `crop = null`).

If the variant has no `background_s3_key` (legacy), the **Crop & Resize** button is replaced with a tooltip: "Cropping is only available for generations made after May 9, 2026."

## 3. Data flow

```
Result page (apps/web/app/(app)/generations/[id]/page.tsx)
      │
      ▼
Variant card includes [Crop & Resize] for completed variants
      │ click
      ▼
<CropEditor> (client component, react-image-crop)
      │ Apply
      ▼
POST /api/generations/[id]/variants/[vid]/recompose
   body: { crop: { x: number, y: number, w: number, h: number },   // 0..1 normalized
           targetWidth: number, targetHeight: number }              // explicit; UI computes from use-case
      │
      ▼
GenerationApi.recomposeVariant(generationId, variantId, args)
      │
      ▼
Renderer: load background_s3_key bytes → sharp().extract(crop in pixels).resize(target).toBuffer()
      │
      ▼
Storage: PUT to output_s3_key (overwrite); update generation_variants row
      │
      ▼
Response: { signedUrl, width, height, recomposedAt }
```

The recompose runs **inline** in the request handler — no SQS round-trip — because (a) the work is small (one Sharp resize, ~200ms), (b) the user is waiting on the UI, and (c) the worker pipeline is bigger than this needs.

Concurrency: a per-variant FOR UPDATE lock prevents two concurrent recompose calls from racing; the second waits or fails fast with 409.

## 4. API contract

Endpoint: `POST /api/generations/[id]/variants/[vid]/recompose`

Request body:
```json
{
  "crop": { "x": 0.1, "y": 0.05, "w": 0.8, "h": 0.6 },
  "targetWidth": 1280,
  "targetHeight": 720
}
```

`crop` coordinates are normalised (0.0 - 1.0) of the source background image's natural dimensions. `targetWidth`/`targetHeight` are pixels.

Validation (Zod):
- crop.x, y, w, h all in [0, 1]
- crop.x + crop.w <= 1.001 (rounding tolerance)
- crop.y + crop.h <= 1.001
- targetWidth, targetHeight in [256, 4096]
- ratio of `crop.w / crop.h` must match `targetWidth / targetHeight` within 1% — the server is authoritative on aspect even if the client gets it slightly wrong

Response:
```json
{
  "outputS3Key": "workspaces/.../variants/<vid>.png",
  "signedUrl": "https://…",
  "width": 1280,
  "height": 720,
  "recomposedAt": "2026-05-09T17:30:00Z",
  "version": 2
}
```

Errors (422 ProblemJSON):
- `invalid_crop_region`
- `aspect_mismatch`
- `variant_not_completed`
- `variant_has_no_background` (legacy variant without background_s3_key)

## 5. Storage strategy

- `background_s3_key` is **immutable** — never overwritten. This is the source of truth and lets users re-crop differently later.
- `output_s3_key` is **overwritten in place** — same key, new content. Cache-busting via a short-lived signed URL with a `?v=<recomposed_at>` query param.
- `generation_variants.recomposed_at` (new nullable column) records the last recompose; `generation_variants.crop_region jsonb` (also new) records the last applied region for "edit again" preset.

## 6. Schema additions

```sql
ALTER TABLE generation_variants
  ADD COLUMN recomposed_at timestamptz,
  ADD COLUMN crop_region jsonb;
```

Migration `0021_variant_recompose.sql`. Backfill not needed — both columns null on legacy rows.

## 7. Out of scope / risks

- **Smart cropping** (e.g., face-aware): pure user-driven only.
- **Crop on inspiration / reference images**: only applies to the variant output.
- **Mobile gesture crop**: react-image-crop supports touch, but careful UX testing on small screens is deferred to a follow-up.
- **Risk: storage drift** — the original output is lost when overwritten. Mitigation: keep `background_s3_key` immutable so the source can always be re-cropped.

## 8. Library choice

`react-image-crop` (npm `react-image-crop@11`):
- ~12kB gzipped
- Aspect-ratio lock built in
- Touch + keyboard support
- Returns `{ x, y, width, height }` in pixels of the source — convert to normalised before POSTing.

No other UI dep.
