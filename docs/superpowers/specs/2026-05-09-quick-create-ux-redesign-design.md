# Quick Create UX Redesign — Design (Sub-project C)

**Date:** 2026-05-09
**Sub-project:** C (depends on A: taxonomy; depends on B: providers + supported sizes)
**Goal:** Replace the current "platform / format / aspectRatio" dropdowns with a use-case-first picker, add a tier+strength selector, and drive the resolution picker from the chosen model's `model_supported_sizes`. Surface multi-model variation. The current cropping pain — image returned at the model's native aspect, then auto center-cropped to a target aspect — goes away because the user picks a resolution the model natively supports.

## 1. Scope

In:
- New `use_cases` reference table — admin-managed catalogue of marketing surfaces (FB Landscape, IG Story, IG Post, LinkedIn Banner, Pinterest Pin, Email Hero, …) with their target dimensions and aspect ratios
- Quick Create wizard rebuild as a 3-step picker: **(1) Use case → (2) Tier (with strength chips for Premium) → (3) Resolution**
- Multi-model variation toggle (when a strength has 2+ eligible models)
- Updated prompt-preview UI (shows the resolved model display name + size + total credits)
- Generation request shape uses A's tier/strength/selectedModelCodes (already accepted server-side)
- `/admin/use-cases` page (CRUD on the new table)

Out:
- Manual crop tool (sub-project D)
- Bulk regeneration / batch UI
- Saving "presets" (use-case + brand defaults)
- Mobile-specific layout (responsive but not iPad/iPhone-optimised)

## 2. Use-case taxonomy

```
use_cases                                                 [NEW, lookup, admin-managed]
─────────────────────────
code             text   PRIMARY KEY      'fb-landscape', 'ig-story', 'ig-post-1x1', 'li-banner', …
label            text   NOT NULL          'Facebook Landscape', 'Instagram Story', …
platform         text                     'facebook' | 'instagram' | 'linkedin' | 'pinterest' | 'web' | 'email'
target_width     int    NOT NULL
target_height    int    NOT NULL
aspect_ratio     text   NOT NULL          '1.91:1', '9:16', '1:1', '16:9', …  (display only)
icon             text                     emoji or icon code for the picker tile
sort_order       int    NOT NULL DEFAULT 0
status           text   CHECK active/paused/deprecated  default 'active'
created_at       timestamptz default now()
updated_at       timestamptz default now()
```

Seed at migration time with the 8-12 most common surfaces. The user picks a use_case; the *target* dimensions are now fixed by that choice (not freely typed).

## 3. Resolution picker behaviour

After the user picks a use_case + tier (+ strength), the system:
1. Resolves the chosen model (default for that bucket, or the explicit `selectedModelCodes`)
2. Fetches `model_supported_sizes` for that model (from B)
3. Filters to sizes whose aspect ratio matches the use_case's `aspect_ratio` (within 5% tolerance)
4. Renders a chip group of compatible sizes; the user picks one
5. If no native size matches the aspect, the picker shows: "No native size matches FB Landscape (1.91:1) for Photoreal Pro. Pick a different model or open the manual crop tool" — links to the strength swap and to D's crop tool
6. If the model has `allow_custom_size = true`, an additional "Custom" tile lets the user enter W×H within model min/max

The variant's `output_target.width/height` is set to the *picked native size*, not the use_case's target. The result page can offer a one-click "Resize to FB Landscape (1080×566)" action that runs sub-project D's recompose with a sensible default crop, but the original generated image is stored at the native size — no auto-cropping, ever.

## 4. UI flow

The current `/generate` page has the prompt textarea + a settings panel. The redesign keeps the prompt in place and replaces the settings panel with a collapsing 3-step accordion:

```
[ Brief / prompt textarea (unchanged) ]

▼ Step 1: Where will this go?
   [grid of use-case tiles: each a card with icon + label + dimension subtitle]

▼ Step 2: How should it look?
   ( ) Standard — Economy (Flux 1.1 Pro)
   (•) Premium
       [pill chips:  Text  Photoreal  Design  Speed  ]
       Selected: Photoreal — Photoreal Pro
       □ Compare with: [Photoreal Ultra] [Imagen 3]   (only shown when bucket has alternates)

▼ Step 3: Pick a resolution
   [chip group of native sizes, default-selected = first match]
   "Custom W×H" tile if model.allow_custom_size

[ Total: X credits   |   Submit ]
```

The accordion auto-advances: picking step 1 collapses 1 and opens 2, etc. Steps 2 and 3 are disabled until step 1 is set.

## 5. API contract

Server side (already shipped in A):
```
POST /api/generations
{
  brandId, brief, ...,
  outputTarget: {
    kind: "social",
    useCaseCode: "fb-landscape",      // NEW — use_case.code; replaces platform/format
    width: 1280, height: 668,         // the picked native size
    aspectRatio: "1.91:1",            // copied from use_case for downstream consumers
  },
  flags: {
    tier: "premium",
    strength: "photoreal",
    selectedModelCodes: ["photoreal-pro"]   // optional; absent = default
  }
}
```

Backwards compat: the existing `platform: "ig"` style payload is still accepted; the API translates it into a synthesised `useCaseCode` if a matching `use_cases` row exists, else falls back to the legacy aspect-driven path. C does not break old callers.

## 6. Estimate endpoint (for UI live total)

A new GET endpoint `/api/generations/estimate?tier=premium&strength=photoreal&selectedModelCodes=...&useCaseCode=fb-landscape&width=1280&height=668&hasInspiration=false` returns `{ totalCredits, models: [{ displayName, credits }] }` so the picker can show credit cost as the user assembles the selection. Implementation reuses `resolveSelection` from A.

## 7. Out of scope

- Caption / overlay text settings (those live elsewhere)
- Brand kit selector (already exists, untouched)
- Inspiration uploads (untouched)

## 8. Risks

- **Empty buckets**: if admin hasn't routed a model to a strength, step 2's chip is disabled with a "Coming soon" tooltip rather than throwing.
- **Use-case → aspect mismatch**: if admin seeds a use_case at 1.91:1 but no model in any strength has a 1.91:1 native size, the picker dead-ends. Mitigation: the admin UI warns at use_case create time when no model matches.
- **Migration of existing user data**: prior generations with the old `platform/format` shape stay valid; only new submissions use the new contract.
