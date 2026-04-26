# UI Generation Prompts — Studio v1

**Status:** Draft for review
**Date:** 2026-04-25
**Owner:** Shehan Fernando
**Companion docs:**
- `2026-04-25-studio-v1-prd.md`
- `2026-04-25-studio-v1-spec.md`
- `2026-04-25-studio-v1-architecture.md`

These prompts are designed to be paired with **your own reference screenshot(s)** when feeding an AI design tool (Vercel v0, Figma Make, Galileo AI, Lovable, UX Pilot, Stitch, etc.). Each prompt is **functionality-first**: it tells the design tool what the UI is for, what it must contain, what behavior it must convey, and what aesthetic constraints to respect — and then lets your reference screenshot dictate the visual style.

## How to use these

1. Pick the screen you want to design.
2. Paste the corresponding prompt block into your design tool.
3. Attach your reference screenshot(s).
4. Add a one-line preface: `"Use the attached screenshot as the visual style reference. Match its layout density, type scale, color discipline, and component idioms. Apply that style to the following functional requirements:"`
5. Iterate.

Each prompt is self-contained; you can use them in any order.

---

## Prompt 0 — Global design system context (paste once, reuse with each screen)

```
You are designing screens for "Studio" — a SaaS application that generates
finished, on-brand marketing images from a short text brief plus the user's
brand kit. Target users are SMB owners, in-house marketers, agencies-of-one,
and individual creators. The product is generation-driven, NOT a canvas
editor — there is no layer panel, no manual layout, no font picker. Users
describe what they want in 1-3 sentences, pick a brand, optionally pick a
"Mood" (a curated style pack like Christmas or Minimalist Tech), click
generate, and receive 3-4 finished image variants.

Design system requirements:
- Modern, clean, professional. Confident but not aggressive.
- Type system: a single sans-serif family (designer's choice). Heading scale
  with 4 levels. Body text with two sizes (default + small).
- Color: neutral grayscale base with ONE brand accent color used sparingly
  for primary CTAs and active state. Not multi-color.
- Spacing: 8px base grid. Generous whitespace; not dense like an admin panel.
- Components: buttons (primary, secondary, ghost), inputs, selects, toggles,
  cards, modals, side drawers, toasts, empty states, loading skeletons.
- Density: comfortable, not compact. This is consumer-grade SaaS.
- Tone: functional and direct in copy. No marketing language inside the app.

Accessibility:
- All interactive elements have visible focus rings.
- All form inputs have labels (visible or aria).
- Color contrast meets WCAG AA at minimum.
- Buttons have a minimum tap target of 44x44.

Responsive:
- Design primarily for desktop (1280-1440 wide). Mobile breakpoint at 768.
- Mobile collapses sidebars to drawers and stacks generation results.

Refer to the attached screenshot for visual style. Match its aesthetic
discipline. Apply that aesthetic to the screen described next.
```

---

## Prompt 1 — Marketing landing page

```
Design a marketing landing page for "Studio".

Hero section:
- Tagline: "On-brand images, in a sentence."
- Subheading: "Describe what you want. Pick your brand. Click generate.
  Studio produces finished marketing images with your logo, fonts, and
  colors — exact, every time."
- Primary CTA: "Start free" (no card required).
- Secondary CTA: "See it work" (opens a 30-second product demo video).
- Hero visual: a side-by-side showing a brief like "Christmas sale, cozy
  living room, 30% off" plus a small brand kit panel (logo + 3 colors +
  font) → ARROW → 4 finished image cards in a 2x2 grid, each with the
  same brand applied differently. Convey the "input → finished output"
  loop visually.

How it works section (3 steps, horizontal):
1. Set up your brand — upload logo, paste colors, pick fonts (~30 seconds).
2. Describe what you want — one or two sentences. Optionally add a Mood
   (like "Christmas" or "Minimalist Tech") for seasonal flavor.
3. Click generate — receive 3-4 finished, brand-correct images in seconds.

Differentiator section (3-column comparison):
- vs. Canva: "Don't need to design. We generate the finished image."
- vs. Midjourney: "Brand-correct by construction — your real logo, your
  real fonts, your real colors. Not approximated."
- vs. AdCreative.ai-style tools: "Curated Mood library: blend seasonal
  and aesthetic style packs with your brand under your control."

Pricing section:
- 5 tier cards: Free / Starter / Pro / Business / Agency.
- Each card shows: price, brands included, seats included, monthly credits.
- A "What's a credit?" tooltip.
- "Top up anytime" callout below the tier grid.

Footer:
- Standard SaaS footer: product, company, legal, social.

The page should feel like a product company that ships, not like a launch
splash. Show real product UI in the hero — not stock illustrations.
```

---

## Prompt 2 — Sign-up / sign-in (Clerk-hosted theme)

```
Design the sign-up and sign-in pages for Studio. These will be rendered
by Clerk's hosted auth, so the design is for the visual theming we hand
to Clerk.

Sign-up:
- Centered card on a clean background (subtle gradient or single-color).
- Studio wordmark at top.
- Heading: "Create your Studio account"
- Subheading: "Free forever for one brand. No card required."
- Provider buttons: Google, Microsoft, Apple (each full-width, with icon).
- Divider: "or"
- Email input + "Continue with email" button.
- Terms/privacy fine print at bottom.
- Sign-in link: "Already have an account? Sign in"

Sign-in:
- Same layout, with copy adjusted ("Welcome back").
- Provider buttons same.
- Email input + "Continue" button (Clerk handles passwordless flow).

The card should feel premium and lightweight — not a heavy enterprise
form. Background subtle, focus on the card.
```

---

## Prompt 3 — Onboarding: brand setup wizard

```
Design a 6-step brand setup wizard, shown immediately after first sign-up.
The wizard is a centered card on a subtle backdrop, with a step indicator
across the top (1 of 6 ... 6 of 6) and Back/Next buttons at the bottom.

Step 1 — Identify the brand:
- Title: "Tell us about your brand"
- Brand name input (required).
- Optional: "Your website URL" — input with a "We'll grab your colors and
  logo automatically" hint. If user pastes a URL, show a small loading
  state, then pre-fill subsequent steps.

Step 2 — Logo:
- Title: "Upload your logo"
- Drag-and-drop zone for SVG or PNG (max 10MB).
- Preview of uploaded logo on a checkerboard transparency background.
- Hint: "SVG works best — it scales perfectly to any size."

Step 3 — Palette:
- Title: "Your brand colors"
- 3 to 5 color swatches in a row, each clickable to open a color picker.
- "Suggest from logo" button (works only if SVG was uploaded).
- Each swatch labeled: Primary / Secondary / Accent / (extra 1) / (extra 2).
- Below: a live preview card showing the colors applied to a sample design.

Step 4 — Fonts:
- Title: "Your typography"
- Two slots: Heading font, Body font.
- Each slot is a searchable dropdown listing 50-100 curated Google Fonts,
  each rendered in its actual face for preview.
- Live sample text showing both fonts in action.

Step 5 — Voice notes (optional):
- Title: "Anything else?"
- Subhead: "Notes about how your brand sounds. We'll use this when
  generating captions."
- A multi-line textarea, max 500 characters.
- Examples in placeholder: "Friendly but professional. Avoid jargon.
  We say 'team' not 'users'."
- Skip button visible.

Step 6 — Reference images (optional):
- Title: "Show us what your brand looks like"
- Subhead: "Optional. Upload up to 10 example images — past campaigns,
  product shots, anything visual we should learn from."
- Drag-and-drop zone, with thumbnails appearing as user adds.
- Skip button visible.

Final step → "All set" toast → redirect to the generation form.

The wizard should feel guided but never patronizing. Each step is a single
decision. The whole thing should take 2-3 minutes.
```

---

## Prompt 4 — Main app shell (sidebar + workspace switcher)

```
Design the main app shell that wraps every authenticated page.

Top bar (full width, ~56px tall):
- Left: Studio wordmark (small).
- Center-left: a workspace switcher dropdown showing current workspace
  name + a small brand-color dot. Click opens a list of user's workspaces,
  with "Create new workspace" at the bottom.
- Right: credit balance pill (e.g., "847 credits"), with a "+" button to
  buy more. Then user avatar dropdown (account, settings, billing, sign out).

Left sidebar (~240px wide, collapsible):
- Sections (in order):
  - Generate (primary, with a small "+" plus icon — feels like the main CTA)
  - History (list of recent generations, badge with count)
  - Brands (list of brands in this workspace, badge with count, "+" to add)
  - Projects (collapsed group; expandable to show projects under each brand)
  - Stock library (link to browse stock assets)
- Bottom of sidebar:
  - Settings (icon link)
  - Help (icon link)
  - Plan badge (e.g., "Pro plan", click → billing page)

Main content area:
- Right of sidebar, fills remaining width.
- This is where every page renders.

The sidebar should be quiet — mostly icons + labels, no noisy badges except
where useful. The "Generate" item should feel like the destination.

Mobile: sidebar collapses to a hamburger, opens as a drawer overlay.
```

---

## Prompt 5 — Generation form (the core screen)

```
Design THE central screen of Studio: the generation form. This is what
the user sees when they click "Generate" in the sidebar. The screen has
two phases: Form (before submit) and Results (after submit). Design the
Form phase here. (Results phase is Prompt 6.)

IMPORTANT context: Studio does NOT publish to social platforms in v1 —
the user only DOWNLOADS the image and posts it themselves. The "social
platform" picker on this form is purely a sizing convenience: picking
"Instagram Story" sets the output to 1080×1920, picking "LinkedIn Post"
sets it to 1200×1200, etc. It does not connect any account.

Layout: split view. Left panel (~60% wide) = the form. Right panel (~40%
wide) = a contextual preview / toggle panel.

Left panel — the form (in this top-to-bottom order):

1. Output target picker (the FIRST decision the user makes):
   - A segmented control with two top-level options:
     - "For social" (default)
     - "Just an image"
   - When "For social" is selected, a second row appears: a horizontal
     scrollable strip of platform/format chips, each with a small icon
     and label:
       - Instagram — Post (1:1) | Portrait (4:5) | Story / Reel (9:16)
       - Facebook — Post (1.91:1) | Story (9:16)
       - LinkedIn — Post (1.91:1) | Square (1:1)
       - TikTok — Photo / Story (9:16)
       - Pinterest — Pin (2:3) | Story (9:16)
       - YouTube — Thumbnail (16:9)
       - X / Twitter — Image (16:9)
     - Each chip selected → shows the exact pixel dimensions in a small
       caption beneath the strip (e.g., "Instagram Story → 1080×1920").
     - The aspect-ratio picker (item 5 below) is HIDDEN when "For social"
       mode is active — the platform selection determines it.
   - When "Just an image" is selected, the platform strip is hidden and
     the aspect-ratio picker (item 5) becomes visible.

2. Brief field:
   - Large multiline textarea (auto-grow, max 500 chars). This is the
     visual hero of the form.
   - Placeholder: "Describe what you want. e.g. 'Christmas sale, cozy
     living room with a glowing tree, 30% off'"
   - Character counter in bottom-right of the field.

3. Inspiration image (optional, per-generation reference):
   - A compact upload zone labeled "Inspiration image (optional)" with
     a sub-label: "Drop an image you'd like this generation to take
     visual cues from. Used for this generation only — doesn't change
     your brand."
   - Accepts JPG / PNG / WebP, max 10 MB.
   - Shows a thumbnail of the uploaded image with a small × to remove.
   - When an inspiration image is present, a small slider appears next
     to the thumbnail: "Influence — Subtle / Balanced / Strong" (three
     positions). Default = Balanced.
   - Tooltip on the (?) icon: "Different from your brand reference
     library. Brand references are persistent across all your
     generations. An inspiration image only applies to this one."

4. Brand selector:
   - A pill-style picker showing the current brand's logo + name. Click
     opens a dropdown of all brands in the workspace. If only one brand,
     no dropdown — just a static pill.

5. Aspect ratio (visible ONLY when "Just an image" is selected above):
   - 4 buttons: 1:1 (Square), 4:5 (Portrait), 9:16 (Story), 16:9 (Landscape).
   - Each button shows a tiny rectangle in the right proportions.

6. Mood picker:
   - Compact horizontal row of mood thumbnails (~6 visible at once,
     horizontally scrollable).
   - Each thumbnail: small preview image + mood name.
   - Sections (subtly grouped, with mini section labels):
     - "Right now" — seasonal moods currently in window (e.g., "Christmas")
     - "Always available" — evergreen moods
     - "Coming soon" — seasonal moods in their pre-window
   - First card is "Just my brand" (no mood) — selected by default.
   - Click a card → it becomes selected with a clear ring/border.
   - Moods in the strip should be filtered/sorted to surface those whose
     supported aspect ratios match the currently selected output target.

7. Primary CTA button at bottom:
   - "Generate (20 credits)" — credit cost dynamically updated based on
     current selections (premium model toggle, inspiration-image
     processing surcharge if any, etc.).
   - Disabled state if brief is empty or output target is incomplete
     (e.g., "For social" selected but no platform chip chosen).

Right panel — toggles & preview:
- Section: Brand
  - Toggle row: "Use brand colors" (default on)
  - Toggle row: "Use brand logo" (default on)
  - Toggle row: "Use brand fonts" (default on)
  - Toggle row: "Brand-strict mode" (default off; with a small (?) tooltip:
    "When on, the Mood only influences the AI background — no decorative
    motifs or accent overlays.")
- Section: Mood (only shown if a Mood is selected)
  - Toggle row: "Apply mood prompt modifiers"
  - Toggle row: "Apply mood decorative motifs"
  - Toggle row: "Apply mood accent colors"
- Section: Quality (only shown for Pro+ tier)
  - Toggle row: "Premium model (gpt-image-1) — 15 credits per variant
    instead of 5"

Below the toggles, a subtle "Estimated cost" line: "20 credits for
4 variants" — updates live.

The whole screen should feel calm and intentional. The brief field is
the hero. The output target picker at the top is the framing decision —
should feel like the natural first step, not a buried option. The
inspiration image upload should look light-touch and obviously optional,
not as prominent as the brief.
```

---

## Prompt 6 — Generation results (the variants screen)

```
Design the results screen — what the user sees after clicking Generate
on the previous screen. This is a single screen that progresses through
states: pending → variants completing one by one → all done.

Top bar of the screen:
- Breadcrumb: Generations / [generation_id short]
- Right side: status pill ("Generating..." while running, "4 of 4 ready"
  when done).

Main area: a 2x2 grid of variant cards.

Variant card (each):
- States the card moves through:
  - Skeleton loader (while queued)
  - Animated placeholder ("Painting your background..." with subtle motion)
  - Image fade-in (when complete)
  - Failed state (error icon + "Try again" link)
- When complete, the card shows:
  - The finished image, full-bleed inside the card.
  - Hover overlay (or persistent footer): action buttons in a row.
    - Download (icon)
    - Regenerate this variant (icon, tooltip: "5 credits")
    - Edit text (icon — opens an inline text-edit drawer described below)
    - Copy link (icon)
  - Below the image, a thin metadata strip: aspect ratio, model used
    (small label, e.g., "Flux 1.1 Pro"), template name.

Edit text drawer (slides from right when "Edit text" clicked):
- Shows the current headline, subhead, and CTA values as text inputs.
- "Re-render" button at the bottom — re-renders this single variant with
  the new text (free; no credits consumed).
- Note: "Editing text doesn't use credits — only regenerating the
  background does."

Footer of the page (sticky bottom):
- "Generate variations" button — opens the form with current brief
  pre-filled.
- "Add caption" button (with credit cost shown, e.g., "1-5 credits") —
  opens a small modal asking length tier (Short/Medium/Long), then
  generates a caption beneath the variant grid.

The page should feel like a delivery, not a workspace. The four images
are the star. Action buttons are subtle until needed.
```

---

## Prompt 7 — Brand kit editor (existing brand)

```
Design the brand kit editor — the page a user sees when they click an
existing brand from the sidebar.

Top: brand header card, full-width:
- Left: logo preview (largest in the page, on a checkerboard transparency).
- Center: brand name (editable inline), source URL (editable, optional).
- Right: meta info (created date, asset count, generation count using
  this brand).

Tabs below the header card:
- "Colors" (active by default)
- "Fonts"
- "Voice"
- "References" (with badge showing count)
- "Danger zone" (right-aligned tab)

Colors tab content:
- Current palette as a row of swatches, each clickable to edit.
- Add/remove swatch buttons.
- Below: a "Preview on a sample design" card showing the colors applied
  to the same sample composition shown in onboarding step 3.

Fonts tab content:
- Heading font display (rendered in actual face, large).
- Body font display (rendered in actual face).
- "Change font" button on each opens the same dropdown as onboarding
  step 4.

Voice tab content:
- The voice notes textarea, editable inline. Save on blur.

References tab content:
- Grid of reference image thumbnails.
- Click a thumbnail → modal preview with delete button.
- "Add reference images" button at top of grid (drag-drop or pick).

Danger zone tab content:
- Single dangerous action: "Delete brand". Confirms with a modal that
  requires typing the brand name. Cascade-deletes all generations,
  references, and ledger entries (the last is recorded as audit, not
  reversed).

The screen should feel like a settings page that's actually pleasant
to be in.
```

---

## Prompt 8 — Generation history (list view)

```
Design the generation history page. This is a chronological list of
the user's past generations across all brands in the current workspace.

Top of page:
- Heading: "History"
- Filter bar: brand selector / mood filter / status filter / date range.
- Search input (full-text search across briefs).

Main: a list of generation rows. Each row:
- Left: a small 2x2 mosaic thumbnail of the generation's variants
  (or a single thumbnail if only 1 variant succeeded).
- Center: the brief text (truncated to 1 line), brand pill, mood pill
  if applicable, aspect-ratio chip.
- Right: status pill, credit cost, timestamp ("3 hours ago").
- Click row → navigate to the generation results screen (read-only mode
  for old entries; download still works).

Empty state:
- Friendly illustration.
- Message: "No generations yet. Try one — it's quick."
- CTA: "New generation"

The page should feel like an inbox-style index, not a heavy data table.
```

---

## Prompt 9 — Mood picker (full-page browser, opened from a "Browse all moods" link)

```
Design a full-page mood browser. Opened from a "Browse all moods" link
on the generation form (when user wants to scroll through more than the
inline strip shows).

Top of page:
- Heading: "Moods"
- Tab strip: All / Right now / Always / Coming soon
- Search input (filters by name + tag).

Main: a responsive grid of mood cards (4-5 per row on desktop).

Each mood card:
- Square preview image (rendered against a synthetic brand at publish
  time).
- Mood name + small kind badge (Seasonal / Evergreen).
- For seasonal: tiny "Available until Dec 30" or "Available from Nov 15"
  caption.
- Hover: lifts subtly, shows "Use this mood" CTA.
- Click → returns to generation form with this mood selected.

Right side: optional filter rail (hidden by default, toggleable):
- Filter by aspect-ratio support
- Filter by accent colors

The mood library is a value-add experience. The page should feel curated,
like a magazine cover wall — not a generic list.
```

---

## Prompt 10 — Billing & plan page

```
Design the billing & plan page (linked from the user dropdown and from
the plan badge in the sidebar).

Layout: single-column with sections.

Section 1 — Current plan:
- Big card showing current plan name (e.g., "Pro"), price, and what's
  included (brands, seats, credits — same three knobs as the marketing
  page).
- Right side of the card: a "Change plan" button.

Section 2 — Credits:
- Large display: "847 credits remaining"
- Subline: "Resets to 1,000 on the 15th of each month"
- Below: a credit usage chart (sparkline showing this period's burn rate).
- Buttons:
  - "Buy top-up credits" (primary CTA)
  - "View ledger" (link)

Section 3 — Top-up packs:
- 3 pack cards in a row:
  - 200 credits — $9
  - 750 credits — $29 (mark as "Best value")
  - 2,500 credits — $79
- Each card has a single "Buy" CTA that opens Stripe Checkout.
- Note below: "Top-up credits never expire."

Section 4 — Billing details:
- Stripe-managed: payment method (last 4 digits, expiry), billing address,
  tax info (VAT ID, etc.).
- "Manage in Stripe Customer Portal" button.

Section 5 — Invoices:
- Table of past invoices: date, amount, status, download PDF.

Section 6 — Plan comparison (collapsed accordion):
- Table comparing all 5 tiers side by side. Same as on landing page.

The page should feel transparent — every number is explained, every
button leads somewhere obvious.
```

---

## Prompt 11 — Admin: Mood Studio (admin-only)

```
Design the admin Mood Studio screen. This is for the platform team only,
not end users. Aesthetic should match the user-facing app but with denser
information density and operator-style controls.

Layout: split view. Left panel = list of moods. Right panel = editor for
the selected mood.

Left panel (mood list):
- Search + filter (kind: all/seasonal/evergreen, status: all/draft/
  published/archived).
- Each list item: small thumbnail + name + small status dot + kind pill.
- "+ New mood" button at top.

Right panel (mood editor) — sections (vertical, scrollable):

A. Identity
- Name
- Slug (auto-generated from name, editable)
- Kind (radio: Seasonal / Evergreen)
- Validity window (only if Seasonal): two date pickers (valid_from / valid_to)
- Status (dropdown: draft / published / archived)

B. Prompt layer
- Multi-line textarea: "Prompt modifiers (appended to user briefs)"
- Multi-line textarea: "Negative prompts (avoid these in generation)"
- Token-count indicator under each textarea.

C. Visual layer
- Color picker row for accent palette (3-5 colors).
- Contrast checker badge (passes/fails AA against light + dark templates).

D. Decoration motifs
- Tag input (free text + autocomplete from existing stock asset tags).
- Below: a preview row of stock assets matching the current tags
  (so the admin can verify the motif makes sense).

E. Template binding
- Multi-select picker of templates.
- Reorderable list with weight inputs.
- Each item shows template thumbnail + name + preferred_model.

F. Typography hint (optional)
- Dropdown: heading-weight preference (Display / Bold / Black / etc.)
- Dropdown: justification preference

G. Aspect ratio support
- Multi-checkbox: 1:1 / 4:5 / 9:16 / 16:9

H. Test render
- Big "Render preview against synthetic brand" button.
- When clicked: shows 4 generated variants below, just like the
  user-facing results screen. The synthetic brand is built-in (admin
  doesn't pick one).

Bottom of the right panel (sticky):
- "Save draft" / "Publish" / "Archive" buttons.
- "Delete" only enabled for unpublished drafts.

The screen should feel like a real authoring tool — comfortable to spend
time in, with everything reachable without modals.
```

---

## Prompt 12 — Admin: Generation inspector

```
Design the admin generation inspector screen. Used by the platform team
to debug a specific generation when a user reports an issue.

Top: search bar — paste a generation ID or workspace ID + brief snippet.

Main view (after a generation is loaded): single column with sections.

Section 1 — Summary:
- Generation ID, workspace, user, brand, mood (if any), aspect ratio,
  status, total credits, requested-at, completed-at.

Section 2 — The brief
- The exact text the user typed.

Section 3 — The composed prompt(s)
- For each variant: the final prompt sent to the AI model (after brand
  grounding + mood layer + text-safe-zone hint). Shown as an expandable
  code block.
- Negative prompt also shown.

Section 4 — Variants
- 2x2 mosaic of the variants.
- Each variant card has a "details" expand:
  - Model used, fallback path taken (yes/no), upstream cost (cents),
    render duration, S3 key, error payload (if failed).

Section 5 — Ledger entries
- Linked credit_ledger_entries for this generation, in chronological
  order: reservation, commits, releases.

Section 6 — Operator actions:
- "Resume failed variants" (re-enqueues failed ones)
- "Override model and re-run" (force-fallback option)
- "Refund this generation" (issues a release entry equal to total cost,
  audit-logged)
- "Flag for AUP review"

The screen is dense, operator-grade. Looks like Stripe's transaction
detail page or Sentry's event detail — pure utility.
```

---

## Tips for working with the prompts

- **Always pair with a screenshot.** Without a visual reference, AI design
  tools default to a generic SaaS aesthetic. Your screenshot is what makes
  this feel like a product, not a template.
- **Iterate on density.** First pass usually ends up either too sparse
  (looks like a marketing page) or too dense (looks like an enterprise
  dashboard). Tell the tool which way to push.
- **Constrain colors hard.** Models love to add gradients and accent
  colors. Tell them: "Single accent color. Everything else is neutral."
- **Reference real components.** If your screenshot uses a specific
  pattern (e.g., shadcn cards, Linear-style sidebars), name it explicitly:
  "Use shadcn-style card components" or "Linear-style command palette."
- **Reject the first output.** First outputs are almost always too generic.
  Ask for two more variants, each pushing in a different direction
  (e.g., "more editorial" / "more dashboard-y").
