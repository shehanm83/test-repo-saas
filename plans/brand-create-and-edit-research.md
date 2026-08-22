# Brand kit — "New brand" + "Edit brand": research and enhancement plan

**Status:** Slices A–D and F implemented. Slice E (URL/logo extraction) is intentionally deferred.
**Scope of this doc:** the create screen (`/brands/new/[step]`) primarily, the edit screen
(`/brands/[id]`) as the thing it must converge with.
**Why now:** the brand kit is the input to *every* downstream surface — Quick Create, Campaign
Builder v2, the renderer overlay. "Brand-exact by construction" is the product's stated moat
(`plans/campaign-builder-v2-research-and-design.md` §74, §109). Today the screen that captures
that data is the weakest screen in the app.

---

## 1 · What exists today

| Piece | File | Lines | Notes |
|---|---|---|---|
| Create/edit screen | `apps/web/components/brands/kit/brand-kit-form.tsx` | — | One sectioned screen with a live right rail; create and edit share it |
| Create route | `apps/web/app/(app)/brands/new/page.tsx` | — | Creates the row once the name is valid, then autosaves |
| Legacy routes | `apps/web/app/(app)/brands/new/[step]/page.tsx`, `apps/web/app/onboarding/brand/[step]/page.tsx` | — | redirect old wizard links to `/brands/new` |
| Edit route | `apps/web/app/(app)/brands/[id]/page.tsx` | — | loads the brand/assets and renders `BrandKitForm` |
| List | `apps/web/app/(app)/brands/page.tsx` | 130 | fine, not in scope |
| API | `packages/api/src/brand.ts` | 242 | create / update / uploadLogo / uploadReference / assets / deleteAsset / extractFromUrl |
| Routes | `apps/web/app/api/brands/**` | — | POST, PATCH, logo, assets, assets/[id] DELETE, delete |
| URL extractor | `packages/api/src/url-extract/*` | 232 | title, description, candidate logos, dominant colours — **works, wired to `/api/extract-url`, called by nothing** |
| Schema | `packages/db/src/schema/brand.ts` | 55 | `brands` + `brand_assets` |

Two independent implementations of the same form. They disagree on the font list, the palette
model, the asset UI, the save semantics, and the visual language.

---

## 2 · Verified defects

Ranked by blast radius. Each was read in the source, not inferred.

### 2.1 Logo dimensions are never recorded → every raster logo is composited squashed
`packages/api/src/brand.ts:136-137` declares `width`/`height` and never assigns them (references
*are* re-encoded and measured at `:186-200`, logos are not). The worker then falls back to a
square: `apps/worker/src/handler.ts:235-236` — `width: asset.width ?? 512, height: asset.height ?? 512`.
A 4:1 wordmark PNG is handed to the renderer as 512×512. **This directly breaks the brand-fidelity
promise on every generation that uses a non-SVG logo.**

### 2.2 Font choices can hard-fail the render
`packages/renderer/src/fonts.ts:26-31` resolves the brand font from Google Fonts by
`family:wght@<weight>` and throws `font-not-found:<family>:<weight>` when it is not there.
The edit screen's picker (`brand-editor.tsx:38-53`) offers **Cal Sans, Arial, Helvetica,
Times New Roman** — none are Google Fonts. The create screen offers a *different* 12-font list
(`brand-wizard.tsx:60-155`) and saves **no weight at all**, so the renderer defaults to 700/400
(`render.ts:21-22`), which some families do not publish. Picking the wrong font in a settings
screen should not be able to fail a paid generation an hour later.

### 2.3 Logo uploads bypass the sanitisation the spec requires
Spec §"Brand asset upload" mandates *sharp re-encode, EXIF strip, mime sniff, max 10 MB*.
`uploadLogo` (`brand.ts:129-176`) enforces only the size cap and trusts the **client-supplied
`file.type`** / filename extension (`rasterImageStorage`, `:50-59`). No magic-byte sniff, no
re-encode, no EXIF strip. SVGs *are* sanitised (`sanitize/svg`) — the raster path is the hole.

### 2.4 `POST /api/brands` returns 500 on a bad URL
`apps/web/app/api/brands/route.ts:20-29` has no `try`/`catch`; `BrandCreateInput.parse` throws a
`ZodError` straight out of the handler. The PATCH route does catch (`[id]/route.ts:24-40`). The
user types `yourbrand` instead of `https://yourbrand`, gets "Brand could not be created."

### 2.5 Brand quota is never enforced
`workspaces.brandQuota` exists (`schema/identity.ts:24`), plans set it (free = 1, starter = 3 —
`packages/billing/src/plans.ts`), the settings and billing pages *advertise* it — and nothing on
the create path checks it. A free workspace can create unlimited brands.

### 2.6 Selected-but-unsaved files are silently dropped when you switch tabs
`openSection` (`brand-wizard.tsx:760-765`) saves with `uploadPendingImages: false` and then
`router.push`es to a different `[step]` value, which remounts the component. `pendingLogos` /
`pendingReferences` hold `File` objects in React state only — the draft in sessionStorage cannot
carry them. Pick 3 logos, click "Colors", come back: they are gone, no warning. The
cleanup effect even revokes their object URLs on unmount.

### 2.7 `brands.logoS3Key` is write-only, and goes stale
Written at `brand.ts:156` on every logo upload (so it means "last uploaded", not "primary"), and
**read nowhere in the codebase**. Deleting that asset (`assets/[assetId]/route.ts`) does not clear
it. Meanwhile the renderer composites `selectedLogoAssets[0]` — the first id the *generation*
picked (`handler.ts:564`). There is no concept of a primary logo anywhere the user can control.

### 2.8 Assorted
- The wizard writes a full default palette (`#2A1F18` … `#F5EFE3`) and `Inter/Inter` fonts on the
  first save even if the user never opened those tabs — brands are born with fake brand data that
  looks deliberate on the list page.
- `e2e/tests/brand-setup.spec.ts` still drives `/onboarding/brand/1-identify` with 1-6 numeric
  step slugs that no longer exist. It cannot be passing.
- Drop zones are `div`s with `onClick` (`brand-wizard.tsx:848`, `:1233`) — no keyboard path, no
  `role`, no `aria`. Colour inputs have no accessible name.
- Reference uploads run serially, each doing `describeImage` + `embedText` server-side, with no
  progress and no per-file state. Ten references = a long opaque spinner.
- The create screen is styled with inline styles on a `#635bff` purple that belongs to no design
  system in this repo; the edit screen uses the Cal classes; the newest code (campaign Brief,
  `components/campaign/brief/brief-screen.tsx`) uses Tailwind v4 + the editorial tokens in
  `app/theme.css`. Three visual languages across two screens for one object.

---

## 3 · Gaps against the spec and against what downstream actually needs

**Spec §3.2 / UI Prompt 3 asked for, never built:**
- *"Your website URL — we'll grab your colors and logo automatically. If the user pastes a URL,
  show a small loading state, then pre-fill subsequent steps."* The extractor exists and returns
  exactly what is needed (`UrlExtraction { title, description, candidateLogos, dominantColors }`).
  It has **zero callers**. This is the single highest-value unshipped feature on this screen.
- *"Suggest from logo"* palette extraction. `extractDominantColors` (node-vibrant) is already a
  dependency; it currently only runs against a remote URL inside the site extractor.
- Searchable dropdown over 50–100 curated Google Fonts rendered in their own face. We have 12
  cards in create, 15 unrenderable names in edit.

**What downstream consumers want that the model does not carry:**
- **A primary logo, plus variants.** The renderer takes exactly one logo. Generation lets you pick
  ids, but the assets are unlabelled thumbnails — no "light background / dark background",
  no "mark vs wordmark". A brand kit that can't say "use the white mark on dark art" is
  guessing every time.
- **Logo safe-area / clear-space and minimum size.** `brand-logo-overlay.yaml` already tells the
  model to *"reserve clean, low-detail space"*; the renderer has no per-brand number to honour.
- **Font weights**, per the renderer's actual API (`fonts.heading.weight`).
- **Campaign Builder v2** reads `brands.voiceNotes` for copy (§262) and shows a brand summary in
  the Brief right rail (§595). Voice is a 500-char free textarea today; the copy pipeline would do
  better with light structure (tone words, words we never use, example line).

---

## 4 · Recommendation for the new "Add brand" screen

### 4.1 Kill the wizard shape
The six tabs are not a wizard — there is no progress, no validation gate, no order dependency, and
"Finish Setup" dumps you at `/generate`. They are a settings page wearing a wizard's clothes, and
the routing between them is the source of §2.6. **One screen, sectioned, scrollable**, matching the
campaign Brief screen pattern already committed (`brief-screen.tsx`): content column + sticky right
rail, live-but-quiet validation, primary action with its blocking reason next to it.

### 4.2 One component for create and edit
`BrandKitForm` renders both. Create = no row yet; edit = row loaded. This deletes ~2400 lines of
divergent code and guarantees the two screens can never disagree about what a brand is again.

### 4.3 Create the row early, then autosave — no client-side draft
The moment the name is valid, `POST /api/brands` creates the row and the URL becomes
`/brands/[id]`. Everything after that is autosave-on-blur (the behaviour slice 41 specified for the
editor). This removes sessionStorage drafts, the `?new=1`/`?fresh=1` reset dance, the pending-file
class entirely, and the "which tab have I saved" ambiguity — **uploads only ever happen against a
real brand id.** A `beforeunload` guard covers the in-flight case.

### 4.4 Lead with URL import
Top of the screen: one field, "Paste your website and we'll set this up." Calls `/api/extract-url`,
then shows a **review card** — proposed name, candidate logos as selectable thumbnails, extracted
palette as swatches you can accept individually. Nothing is applied without a click. Falls back
silently to the manual form on failure (the extractor is best-effort by design: 5s timeout, 5 MB
cap, SSRF-guarded). This turns a 6-step chore into "paste, confirm, done" and is the difference
between a brand kit that gets filled in and one that gets abandoned at step 2.

### 4.5 Section list for the single screen
1. **Identity** — name (required), website, one-line "what you sell" (feeds prompts).
2. **Logos** — drop zone; each asset gets a **role** (primary / mark / wordmark / icon) and a
   **background** (light / dark / any); exactly one primary, enforced. Preview on checkerboard *and*
   on a dark tile, because that is where wrong logo variants become obvious.
3. **Colours** — 3–6 swatches with roles, hex text input beside the picker, contrast pair check on
   primary/secondary, "extract from logo" button, and the sample-design live preview (keep it —
   it is the best thing on the current screen).
4. **Typography** — searchable curated Google Fonts catalogue, family **and weight**, each option
   rendered in its own face, validated against what the renderer can actually fetch.
5. **Voice** — keep the textarea, add three optional chips-style inputs: tone words, never-say
   words, one example sentence. Cheap to store, immediately useful to the caption/campaign prompt.
6. **References** — parallel uploads with per-file progress, up to 10.

Right rail: live brand-card preview (exactly what the list and the campaign Brief rail will show),
a completeness meter that names what is missing and why it matters ("no dark-background logo — art
with dark backgrounds will use the primary logo"), and the "logo, fonts and palette are placed by
the renderer, never generated" line already used in the campaign rail.

### 4.6 Data-model changes this implies
- `brand_assets`: `role text`, `background text`, `label text`, `is_primary boolean`, and actually
  **populate `width`/`height`** (sharp for raster, viewBox parse for SVG).
- `brands.fonts`: persist `weight` from both screens; validate family+weight against the catalogue
  server-side.
- `brands`: `descriptor text` (one-line what-you-sell), `voice jsonb` alongside `voiceNotes` for the
  structured bits, `logo_clear_space` numeric (optional, cheap).
- Retire `brands.logoS3Key` in favour of the `is_primary` asset — or keep it as a denormalised
  mirror maintained on every asset write **and delete**. Decide, don't leave it half-alive.

---

## 5 · Suggested slicing

| Slice | Content | Why this order |
|---|---|---|
| **A — correctness floor** ✅ | §2.1 logo dimensions, §2.3 sanitisation, §2.4 500, §2.5 quota, §2.7 logoS3Key decision. API + worker only, no UI. | These are shipping bugs that degrade output today, independent of any redesign. |
| **B — font catalogue** ✅ | One shared curated Google-Fonts catalogue module with verified weights; both screens consume it; server-side validation. | Removes the render-failure class before the UI is rebuilt on top of it. |
| **C — schema** ✅ | asset role/background/label/is_primary + brand descriptor/voice fields + migration. | Unblocks the UI. |
| **D — `BrandKitForm`** ✅ | The single-screen create/edit component, create-then-autosave, Tailwind editorial system. Replaces both the wizard and the editor. | The main event. |
| **E — URL import** — deferred | Review-card flow over the existing extractor + "extract from logo" palette. | Highest perceived value; lands on a stable form. |
| **F — tests** ✅ | RTL for the form (validation, autosave, role enforcement), rewrite `e2e/tests/brand-setup.spec.ts` against the real routes. | Current e2e is dead code. |

---

## 6 · Open decisions for you

1. **Onboarding path.** Does first-run brand setup stay a distinct guided experience, or does a
   new user land on the same single screen with a "paste your website" hero? (I lean: same screen —
   one code path, and the URL import *is* the guided experience.)
2. **Quota behaviour when full.** Block create with an upgrade prompt, or allow and mark the extra
   brands read-only? Block is simpler and matches how the billing page describes the limit.
3. **Structured voice.** Add the three optional fields now, or keep the free textarea until Campaign
   Builder's copy pipeline actually asks for more?
4. **Retire `logoS3Key` or maintain it?** Retiring is a migration; maintaining is a footgun that has
   already gone stale once.
5. **Is Slice A worth doing standalone and shipping first?** It is a day of work and it improves
   every generation for existing brands without touching a pixel of UI.
