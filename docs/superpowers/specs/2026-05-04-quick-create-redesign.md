# Quick Create Redesign — HTML-style numbered sections

**Date:** 2026-05-04
**Scope:** `quick-create.tsx` full rewrite + `cal-studio.css` additions
**Does not change:** `generate-shell.tsx`, reducer, ReviewRail, Campaign Builder, any API routes

---

## Goal

Redesign the Quick Create tab so it looks pixel-close to `vyora_image_generation_page.html` — numbered section cards, option cards with hover lift, platform pills — while keeping all current functionality (multi-product picker, inline product editor, brand/mood, output settings) and adding three targeted changes:

1. New **Choose media** step (section 1) that drives `outputs.formats`.
2. **Promotion/campaign toggle** in section 2: checkbox collapses/expands all `CampaignDetails` fields.
3. **Image prominence section removed** entirely.
4. Sidebar ReviewRail unchanged; HTML step 9 (inline review) skipped.

---

## Files

### Modified
- `apps/web/components/generate/commercial/quick-create.tsx` — full rewrite
- `apps/web/app/cal-studio.css` — add `qc-*` classes (~80 lines)

### Unchanged
- `generate-shell.tsx`, `types.ts`, `review-rail.tsx`, `campaign-builder.tsx`
- `BrandMoodStep`, `ProductStep`, `ProductPicker`, `InlineProductEditor`, `OutputSettingsStep`
- All API routes and server logic

---

## Section layout

| # | Title | Content |
|---|-------|---------|
| 1 | Choose media | 5 option cards + platform pills when "For social" active |
| 2 | Product / promotion image | 2-col layout: left = `ProductStep` (picker + inline editor), right = product preview. Promotion toggle + collapsible campaign fields below. |
| 3 | Describe your image | `brief` textarea, 500 char limit |
| 4 | Brand & mood | Full `BrandMoodStep` component (brand select, palette, mood cards, brand toggles) — one section card |
| 5 | Generation settings | Quality tier cards + number of samples cards |

---

## Local state (quick-create.tsx only)

```ts
const [mediaType, setMediaType] = useState<"social"|"image"|"story"|"portrait"|"custom">("social")
const [platform, setPlatform] = useState<OutputFormat>("instagram_square")
const [promotionEnabled, setPromotionEnabled] = useState(false)
```

- `mediaType` + `platform` → call `onOutputsChange` on every change to sync `outputs.formats`
- `promotionEnabled` false → call `onCampaignChange` to zero out all `CampaignDetails` fields on collapse

---

## Media type → OutputFormat mapping

| Media card | Platform pill | Format |
|-----------|--------------|--------|
| For social | Instagram | `instagram_square` |
| For social | Facebook | `facebook_feed` |
| For social | LinkedIn | `linkedin_feed` |
| For social | TikTok | `instagram_story` |
| For social | Pinterest | `instagram_portrait` |
| For social | YouTube | `website_banner` |
| For social | X / Twitter | `ad_creative` |
| Just an image | — | `product_card` |
| Story / Reel | — | `instagram_story` |
| Portrait | — | `instagram_portrait` |
| Custom size | — | `website_banner` |

---

## Product preview (section 2 right column)

`ProductPicker` already calls `URL.createObjectURL()` and stores the result in `SelectedProduct.previewUrl`. No new object URLs are created in Quick Create.

- Right column shows `selectedProducts[0]?.previewUrl` as an `<img>` (object-fit: contain, max-height ~130px)
- If no product selected yet: show the HTML-style placeholder box ("PRODUCT" label, matching the HTML example column)
- If selected product has no `previewUrl` (saved/draft): show initials in the same placeholder box
- Multiple products → only the first is shown in the right preview; all selected products are listed by `ProductPicker` on the left

---

## Promotion toggle behaviour

- Default: checkbox unchecked, campaign fields hidden
- On check: reveal all `CampaignDetails` fields (title, subtitle, price, discount, CTA, message, benefits, target audience, expiry, website, QR URL, legal text) — same fields as current `CampaignDetailsStep` minus the `brief` textarea (brief stays in section 3)
- On uncheck: call `onCampaignChange` with all fields reset to `""` so the payload stays clean

---

## CSS additions (qc-* namespace)

| Class | Purpose |
|-------|---------|
| `.qc-section` | White card, 1px border, 24px radius, 26px padding, box-shadow |
| `.qc-num` | 28px dark circle, white text, flex-shrink 0 |
| `.qc-step-title` | flex row, gap 12px, 20px font, -0.03em tracking |
| `.qc-hint` | muted 14px text, margin-left 40px |
| `.qc-media-grid` | 5-col grid, 14px gap, responsive 2-col at ≤900px |
| `.qc-option` | Selectable card, hover lift, active violet border + light bg |
| `.qc-platform-row` | flex wrap, 10px gap, margin-top 14px |
| `.qc-pill` | Pill button; `.qc-pill.is-active` violet bg |
| `.qc-thumb-strip` | flex row, 8px gap, flex-wrap wrap |
| `.qc-thumb` | 48×48, border-radius 10px, object-fit cover |
| `.qc-thumb--initials` | same size, colored bg, centered initials text |
| `.qc-promotion-row` | flex row, checkbox + bold label, separator above |
| `.qc-promotion-fields` | shown/hidden based on `promotionEnabled` |
| `.qc-gen-grid` | 2-col grid for quality + samples |
| `.qc-gen-option` | Same as `.qc-option` but used for quality/samples cards |

---

## Section 4 (BrandMoodStep)

`BrandMoodStep` is rendered as-is inside a single `.qc-section` card. It already contains brand select, palette, mood cards, and brand toggle rows — no changes to the component itself. The `qc-section` wrapper provides the new visual container.

---

## Verification

```bash
pnpm --filter @vyora/web typecheck
pnpm --filter @vyora/web test
```
