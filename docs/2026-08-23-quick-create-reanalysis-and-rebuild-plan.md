# Quick Create Reanalysis and Rebuild Plan

**Date:** 2026-08-23  
**Status:** Phases 0–3 implemented; Phases 4–6 remain planned  
**Scope:** `/generate` Quick Create, its generation pipeline, and removal of the legacy Campaign Builder tab from that page

## Executive decision

Quick Create should be rebuilt, not visually reskinned.

The present flow is a seven-section commercial form wrapped around a mostly static prompt-template pipeline. The UI asks users to translate an idea into implementation details before the AI helps. More importantly, there are concrete data and pipeline defects that explain inaccurate, irrelevant, repetitive, and unattractive outputs:

- selected saved products contribute text metadata but no product image to generation;
- uploaded products and certification marks are both treated as generic inspiration references;
- the selected layout intent is stored but not used to select the renderer template;
- several exact campaign fields are collected but never rendered;
- samples do not have explicit, intentionally different creative concepts;
- Mood Library data is only partially applied and is not treated as a coherent, versioned visual direction;
- provider capabilities and prompt features are not consistently enforced;
- generated aspect ratios can differ from final aspect ratios and are then fitted with `contain`, producing conservative framing or visible empty space;
- there is no semantic or visual quality check against the user's request.

The legacy Campaign Builder tab has been removed from `/generate`. The new Campaign experience owns `/campaigns` and `/campaigns/new`; keeping the old builder inside Quick Create gave users two competing campaign paths and forced Quick Create to carry obsolete shared state.

## Implementation status

- **Phase 0 complete:** versioned evaluation fixtures, an offline/controlled-remote runner, credit and asset-binding safety guards, Quick Create telemetry, and a disabled-by-default V2 feature flag are in place. The credit-bearing visual baseline still needs to be run in a dedicated evaluation workspace.
- **Phase 1 complete:** `/generate` is Quick Create-only, old campaign links redirect to `/campaigns/new`, the legacy campaign UI and active API/worker mode have been deleted, and coverage has been updated.
- **Phase 2 complete:** saved and uploaded product assets are snapshotted as essential `product_identity` references; curated mood references and exact overlay assets have distinct roles; uploads are gated in the client and server; provider capability routing cannot silently discard essential references; layout/slot/mood/aspect compatibility is enforced; exact copy, logos, certifications, and QR codes are renderer-owned; output fill and OpenAI negative-constraint translation are implemented.
- **Phase 3 complete:** the versioned planner contract and `POST /api/quick-create/plan` are implemented; planner input includes brand/product/attachment/output/mood context; JSON is validated with deterministic offline fallback; explicit mood locks and seasonal/entitlement rules are enforced; deliberate per-sample `VariantSpec` records carry stable seeds and distinct creative axes; plans, prompts, reference ordering, model/provider choice, mood snapshots, and ancestry-ready metadata are persisted per variant.
- **Phase 4 implementation complete:** the V2-flagged composer-first UI now includes explicit visual-reference and product-identity uploads, Brand/Product/Format popovers, the dialog-based discoverable Mood Library, explicit AI-mood acceptance, influence controls, plan/direction review before credits, advanced controls open by default, local plus server-synced draft recovery, and in-workspace progress/results. Automated keyboard/focus/mobile/reduced-motion coverage is in place; the release candidate still needs the planned manual browser/screen-reader pass.
- **Phase 5 implementation complete:** final images receive separately stored intent, identity, subject, crop, packaging, brand, safe-zone, text-artifact, overlay, and mood scores with evidence; soft failures rank lower; hard failures receive one automatic zero-additional-credit retry; structured feedback, constrained natural-language refinement, another-result treatment inheritance, mood locks/changes, variant ancestry, and stored-copy text editing are implemented.
- **Phase 6 tooling complete; controlled rollout pending:** stable workspace-percentage cohorts retain V1 as the fallback, the provider/template capability matrix is documented and enforced, and the evaluation analyzer compares acceptance, downloads, rejection reasons, refinements, latency, credits, provider, and aspect ratio. The credit-bearing multi-provider evaluation, rollout-percentage increases, and eventual V1 deletion intentionally remain release operations requiring a dedicated evaluation workspace and observed adoption data.

## Current workflow

```text
User brief + seven form sections
        |
        v
Shared Quick/Campaign reducer
        |
        +--> debounced schema/cost preflight
        |
        +--> mandatory developer-style prompt preview
        |
        v
Commercial request normalization
        |
        v
Template chosen by mood + aspect ratio
        |
        v
Static YAML prompt + optional references
        |
        v
Provider selected largely from renderer-template model preference
        |
        v
Generated background -> renderer overlay -> separate results page
```

This is form-driven rather than AI-assisted. The AI is only invoked after the user has made nearly every decision, and there is no interpretation, clarification, concept planning, or iterative refinement loop.

## Findings

### P0 — Output accuracy and relevance defects

#### 1. Saved product images are not grounded in generation

The Generate page loads product text fields only. `ProductPicker` submits a `productId` and metadata, and the API snapshots those text fields, but neither the API nor worker loads `product_assets` for the selected product. The worker only builds references from uploaded inspiration, brand assets, and the stock selection.

**Evidence:**

- `apps/web/app/(app)/generate/page.tsx`
- `apps/web/components/generate/commercial/product-picker.tsx`
- `packages/api/src/generation.ts#snapshotProductRefs`
- `apps/worker/src/handler.ts#handle`
- `packages/db/src/schema/product.ts#productAssets`

**Impact:** A user can select a saved product and receive an image of a generic product inferred from its name. Product shape, packaging, color, label, and identity are not grounded.

#### 2. Reference types are semantically incorrect

A product upload uses `/api/uploads/inspiration` and becomes an `inspiration` reference. A selected certification mark is prepended to the same inspiration list. The image model is therefore asked to treat identity-critical product imagery and an exact certification mark as style/visual inspiration. The certification asset is not composited exactly by the renderer.

**Impact:** Product identity may drift, while a certification mark may be distorted, hallucinated, or influence the scene instead of appearing as an exact mark. This is also a commercial trust risk.

#### 3. The requested layout is not actually selected

The request carries `template.family` and `template.layout`, but `pickTemplates` filters only by mood and aspect ratio (plus one special image-only slug). The family/layout values are included as prompt text but do not control which renderer template is used.

**Impact:** The prompt, safe zones, and renderer may disagree. The review rail can tell the user one layout while a different database template is used.

#### 4. The overlay contract is only partially implemented

The prompt system creates slots for headline, subtitle, price, discount, badge, CTA, legal text, website, phone, QR URL, and logos. The worker passes only headline, subtitle, and CTA to the renderer. When no campaign headline exists, it falls back to using the entire generation brief as the headline.

**Impact:** The UI collects information that silently disappears. Long briefs may become visible overlay copy. Meanwhile the image prompt explicitly tells the model not to draw this text, so missing renderer fields cannot appear correctly anywhere.

#### 5. Provider behavior does not honor the full prompt/reference contract

- OpenAI generation receives the positive prompt but the separately built negative prompt is not sent or merged into provider-specific instructions.
- Routing checks whether an inspiration reference exists, but does not route on required product-identity preservation, multi-reference support, or reference count.
- OpenAI reference weights are not expressed to the provider; Flux uses only one reference; Recraft ignores brand references.
- Prompt-template `compatible_models` metadata is returned for inspection but not used to enforce routing.

**Impact:** The same request behaves differently by whichever model the selected renderer template prefers, with silent loss of constraints or references.

#### 6. Output ratios are generated and rendered inconsistently

OpenAI maps both 4:5 and 9:16 to 1024x1536, and maps both 16:9 and 1.91:1 to 1536x1024. The final renderer can target a different ratio and the Quick Create fallback uses `objectFit: contain`.

**Impact:** The output can have empty margins/letterboxing or an overly small subject. Repeated global “never crop” instructions further bias every concept toward conservative centered compositions, which helps containment but reduces visual energy and variety.

#### 7. Multiple samples are not designed as meaningful alternatives

Each variant generally receives the same rendered prompt. No variant index is supplied to the prompt builder in the worker, no seed or concept axis is assigned, and prompt metadata is stored on the generation rather than per variant.

**Impact:** Samples can be near-duplicates or accidental variations instead of deliberate options such as editorial, lifestyle, bold graphic, or clean studio directions.

#### 8. There is no quality or relevance gate

Preflight checks schema, pricing, dates, and a few copy rules. After generation, the only automated check is safety moderation. There is no check for prompt relevance, selected product identity, missing product, packaging distortion, brand fit, crop/safe-zone compliance, or overlay legibility.

**Impact:** Known-bad images consume credits and are shown to the user with no ranking, retry, or explanation.

#### 9. Mood Library integration is fragmented

The existing Mood Library is valuable and should be retained. Today a selected mood can affect prompt modifiers, negative prompts, accent colors, decoration tags, typography hints, aspect-ratio eligibility, and template ranking through `mood_template_bindings`. However, these effects are spread across prompt construction, template lookup, and renderer flags rather than represented as one auditable visual-direction contract.

The current mood preview image is shown to the user but is not sent to the image provider as a style reference. The prompt builder selects the mood modifier whenever a mood exists, even when `applyMoodModifiers` is false. Mood-template bindings can also select a renderer without considering the requested layout. This makes the visible mood choice less predictable than it appears.

**Impact:** Users cannot tell which aspects of a mood will be applied, how strongly it will affect their brand/product, or whether a provider actually received enough visual grounding to reproduce it.

### P1 — Workflow and UX problems

#### 1. Quick Create is not quick

The user sees a creative brief followed by channel, format, campaign details, product, brand, mood, stock mark, and generation settings. Optional controls occupy the same visual weight as the core idea. This resembles a configuration form, not a modern AI creation surface.

#### 2. Campaign Builder is duplicated

`/generate` exposes Quick Create and the old Campaign Builder as peer tabs, while the sidebar has a dedicated `/campaigns` destination and the new campaign shell at `/campaigns/new`.

**Decision:** Remove the Campaign Builder tab, mode switch, `?mode=campaign` state, and old builder import from `/generate`. Preserve read compatibility for stored `campaign_builder` generations. Redirect old `/generate?mode=campaign` links to `/campaigns/new` during a compatibility window.

#### 3. The prompt preview is a required extra step

The primary button first opens a modal titled “OpenAI prompt preview,” even when another provider may be selected. This is an internal debugging tool presented as the main user workflow, and requires another click before creation starts.

**Decision:** Generate directly. Keep prompt inspection behind an Advanced/Debug control for operators.

#### 4. Important choices are hidden defaults while low-value choices are prominent

Quick Create fixes background to studio, realism to realistic photo, position to template, and layout to centered product hero. Users cannot easily correct these high-impact assumptions, yet they are asked for legal text, QR URL, and certification marks.

#### 5. Upload state is not a submit gate

Quick readiness checks brief, format, quality, and sample count only. A product can still be uploading or can have failed upload and generation remains eligible.

**Impact:** The UI shows a product preview that the backend never receives.

#### 6. Some format labels imply unsupported media

Reel, feed video, and TikTok video choices still result in a PNG image. These should be labelled as covers/static creatives or hidden until motion generation exists.

#### 7. Brand context is incomplete or misleading

No brand is selected by default, even if there is only one. The brand's business descriptor is not loaded into Quick Create prompts. Individual flags are not faithfully reflected in prompt construction, and `brandStrict` has no enforcement path. Font previews are generic rather than using the selected brand fonts.

#### 8. The result experience is not an AI refinement loop

Results live on a separate page with download, zoom, text rerender, caption, and project actions. There is no visible “make it warmer,” “keep this product but change the scene,” “use option 2's lighting,” or feedback flow. A regeneration API exists but is not surfaced as a guided refinement tool. The text editor also starts with hard-coded promotional copy instead of the actual overlay values.

### P2 — Architecture and measurement problems

- Quick Create and the legacy Campaign Builder share one reducer, contract, review rail, page shell, and result branching. This makes removing or evolving either flow risky.
- Prompt preview and worker prompt construction are separate executions and can drift.
- YAML prompt templates and database renderer templates are separate systems without a validated compatibility link.
- The model is effectively selected through renderer-template preference rather than task requirements.
- Prompt metadata is last-writer-wins at generation level, not auditable per variant.
- Telemetry covers jobs, latency, credits, and completion, but not user acceptance, relevance, product fidelity, retries, downloads, or rejection reasons.
- Tests verify payload wiring and text presence. There is no representative brief/reference evaluation suite or visual regression gate.

## Target Quick Create experience

### Product principle

Quick Create should ask for the idea first, infer a production-ready plan, show only the decisions that need confirmation, and make refinement cheaper than restarting.

### Proposed interaction

1. **Compose** — one large input: “What do you want to create?” Users can type naturally and attach a product, reference image, or exact asset in the same composer.
2. **Context** — compact chips for Brand, Product, Format, and Visual Direction. Sensible defaults are preselected from the workspace/last use. Each chip opens focused controls; no seven-section form.
3. **AI interpretation** — the system converts the request into a structured creative plan: subject, scene, action, audience, visual style, composition, copy/overlay intent, constraints, and output. It asks a clarification only when an ambiguity materially changes the result.
4. **Direction cards** — for 2–4 samples, show short concept labels before or during generation (for example “Clean studio hero,” “Warm lifestyle moment,” “Bold editorial crop”). The concepts differ intentionally while locked facts remain identical.
5. **Generate in place** — no mandatory prompt modal. Progress and partial results appear in the same workspace.
6. **Refine** — select a result and give a natural-language change. Users can lock Product, Composition, Brand, or Copy so refinement changes only what they requested.
7. **Export** — exact text, logos, certification marks, and QR codes are composited deterministically and remain editable without regenerating the background.

### Progressive disclosure

The default surface should show only:

- idea/composer;
- attachments;
- brand/product/format chips;
- number of directions;
- Generate.

An Advanced panel may expose camera/composition, reference influence, negative constraints, model/quality, safe zones, and prompt inspection.

## Mood Library integration

### Role in the new workflow

Mood should be the reusable, curated visual-direction layer between the user's idea and the final variant concepts. It must not become another long required form section.

In the composer, Mood appears as one compact chip alongside Brand, Product, and Format:

- **Just my brand** — no library mood; the planner uses the user's request and brand rules.
- **AI suggested** — the planner recommends one to three compatible moods with a short explanation, but does not silently lock one.
- **Selected mood** — the user explicitly picks and locks a Mood Library entry.
- **Explore moods** — optional mode where variants intentionally use different compatible moods; otherwise all variants share one mood and differ in composition/camera/lighting within it.

The Mood Library remains accessible as a searchable visual browser. The default Quick Create path shows only the selected or recommended chip; opening it reveals previews, seasonal/evergreen grouping, compatibility, and influence controls.

### Mood selection flow

1. The user writes the idea and optionally selects a mood.
2. The planner searches published, entitled moods that support the selected output ratio and are seasonally valid for recommendation.
3. If the user explicitly selected a mood, the planner treats it as locked and may not replace it.
4. If no mood was selected, the planner can recommend compatible moods based on the request, product category, audience, brand, and format.
5. The user can accept a recommendation, choose another mood, choose Just my brand, or adjust influence.
6. The selected mood is snapshotted into every `VariantSpec`. Changing the Mood Library entry later must not alter an existing generation or refinement chain.

Seasonal validity should control AI recommendations and “Right now” placement. A published mood outside its active window may still be selectable only if product policy allows explicit off-season use; it should never be silently recommended.

### Structured mood recipe

The current fields should be evolved into a versioned `MoodRecipe`, while retaining backward compatibility with existing records:

- identity: mood ID, slug, version, name, evergreen/seasonal status, validity dates;
- visual recipe: lighting, atmosphere, color treatment, camera/lens feel, depth, surfaces/materials, composition tendencies, and allowed decorative motifs;
- negative constraints: visual traits and artifacts to avoid;
- renderer recipe: accent palette, decoration tags, typography hint, safe-zone preference, and compatible template/layout families;
- reference assets: one or more curated, licensed mood images with purpose and weight;
- compatibility: aspect ratios, suitable content types/product categories, supported providers/models, and entitlement tier;
- influence: `subtle`, `balanced`, or `strong`;
- precedence/locking: whether the mood is user-selected, AI-suggested, or inherited from a refinement.

Existing `promptModifiers`, `negativePrompts`, `accentPalette`, `decorationTags`, `typographyHint`, `supportedAspectRatios`, preview, and template bindings can seed this structure. Add descriptions/tags or search embeddings so AI recommendation is not based only on the mood name and raw prompt text. If multiple curated references are required, add mood assets rather than overloading a single preview key.

### How a mood affects generation

A selected mood must be applied consistently at four layers:

1. **Creative planner** — constrains concept direction without changing user facts, product identity, claims, or requested subject matter.
2. **Image provider** — adds provider-specific style instructions and, when licensed and supported, curated mood images as typed `style_reference` assets. Provider routing must ensure essential references are supported.
3. **Template/renderer** — ranks only mood-bound templates that also satisfy the requested layout, slot capacity, and aspect ratio; applies approved accent colors, decorations, and typography hints.
4. **Quality evaluation** — scores mood adherence separately from user-intent relevance, product identity, and brand compliance.

The mood preview must not automatically be sent as a reference merely because it is displayed. Only curated assets explicitly approved for model use should become `style_reference` inputs.

### Brand, product, and mood precedence

Conflicts must be resolved predictably:

1. user facts and explicit constraints;
2. product identity, label, packaging, and exact-asset locks;
3. strict brand rules, logo usage, and protected brand colors;
4. selected mood recipe;
5. AI-suggested embellishments.

A mood may change lighting, setting, supporting colors, camera treatment, texture, and decoration. It must not recolor a protected product, alter packaging, redraw a logo, invent claims, or override an explicitly requested scene. With strict brand mode, mood accents are blended only into unprotected background/decorative areas. The UI should explain conflicts, for example: “This mood's orange accent will be limited because your strict brand palette is active.”

### Mood influence and refinement

- **Subtle:** atmosphere, lighting, and restrained supporting color only.
- **Balanced:** full visual treatment while preserving brand/product priority.
- **Strong:** mood-led art direction, still respecting locked identity and exact assets.

Refinement can change or lock mood independently: “Keep this composition and product, switch to Nordic Winter,” or “keep the mood, make the camera more dynamic.” The refinement request should inherit the snapshotted mood version unless the user explicitly changes it.

### Entitlements and discovery

Entitlement should control applying/generating with a mood, not necessarily whether users can discover the library. Where product policy permits, free users can browse previews and see why a mood is locked, while the server remains authoritative and blocks unauthorized application. Quick Create must never receive an empty mood catalog and then imply that no moods exist when they are merely unavailable on the current plan.

## Target generation architecture

```text
Natural-language idea + typed assets + workspace context
                         |
                         v
              AI creative planner (JSON)
                         |
              validate / clarify / user edits
                         |
                         v
        N deliberate variant specifications with locks
                         |
                         v
       task-aware provider and reference-capability routing
                         |
                         v
      provider-specific prompt + typed image references
                         |
                         v
   generated scene -> exact deterministic asset/text overlay
                         |
                         v
       visual QA -> rank / retry failed variants -> results
                         |
                         v
              feedback and constrained refinement
```

### Required contract changes

Introduce a versioned Quick Create V2 contract separate from the campaign contract. It should include:

- raw user request;
- structured creative plan and its version;
- snapshotted `MoodRecipe`, selection source, influence, lock state, and curated style-reference IDs;
- typed assets (`product_identity`, `style_reference`, `composition_reference`, `brand_reference`, `logo_overlay`, `certification_overlay`, `qr_overlay`);
- asset importance/lock state and provider ordering;
- output target and static-versus-motion media type;
- exact renderer-owned copy/assets;
- variant concept specification and seed;
- model/provider strategy;
- per-variant prompt, references, QA result, and refinement ancestry.

The brand-new project does not require legacy Campaign Builder snapshot compatibility. The active commercial contract now accepts Quick Create only; the separate new Campaign flow owns its own contract and route.

## Implementation plan

### Phase 0 — Baseline and safety net

**Goal:** Make output quality measurable before changing the pipeline.

- Build a versioned evaluation set covering product packshots, people/lifestyle, abstract concepts, promotions, brand-only work, multiple aspect ratios, weak briefs, and conflicting instructions.
- Include saved product assets, uploaded products, multiple references, logos, and exact marks.
- Include no mood, AI-recommended mood, explicit evergreen/seasonal moods, mood/brand conflicts, and all influence levels.
- Record baseline: intent relevance, product identity, subject completeness, brand fit, layout suitability, text-safe zones, visible empty bars, generation latency, and credits per accepted result.
- Add event instrumentation for generate, preview, accept/download, refine, regenerate, reject reason, and upload failure.
- Put V2 behind a workspace feature flag until the evaluation gate passes.

**Exit criteria:** reproducible baseline report and fixtures that can be run in CI/offline mock mode plus a controlled real-model evaluation job.

### Phase 1 — Remove the old Campaign Builder from Quick Create

**Goal:** Give each creation workflow one clear home.

- Make `/generate` Quick Create-only.
- Remove the pathway tab list, mode-switch reducer action, Campaign Builder import/render branch, and campaign-mode query synchronization from `generate-shell.tsx`.
- Change the page heading from “Commercial image builder” to a Quick Create/AI studio heading.
- Redirect `/generate?mode=campaign` to `/campaigns/new` while preserving other useful query parameters where applicable.
- Update unit and Playwright tests. Move campaign coverage to `/campaigns/new`.
- Remove the now-unreferenced old `components/generate/commercial/campaign-builder.tsx`, its exclusively used step components, and its active API/worker mode after an import audit.

**Exit criteria:** there is no Campaign Builder tab on `/generate`; the sidebar Campaigns item is the only campaign entry point; old links land on the new builder.

### Phase 2 — Fix grounding and deterministic output (complete)

**Goal:** Stop losing or misclassifying user assets.

- Load a selected saved product's primary cutout/product/packaging asset and preview it in Quick Create.
- Snapshot exact asset IDs and storage keys at request creation so later product edits do not change an in-flight generation.
- Add typed reference roles to `AIImageRequest`; stop representing product assets and certification marks as inspiration.
- Add `style_reference` handling for curated Mood Library assets and keep it distinct from product identity and user inspiration.
- Block submission while required uploads are pending, failed, missing, or unclaimable.
- Route essential identity references only to providers that support the required reference count and image-edit behavior; fail clearly instead of silently dropping them.
- Render logos, certification marks, QR codes, and exact copy as deterministic overlays. Never ask an image model to reproduce a certification mark or QR code.
- Either honor a selected renderer layout exactly or remove that promise from the request. Filter templates by slot capacity, family/layout, aspect ratio, and renderer compatibility.
- Require mood-bound template selection to satisfy mood, requested layout, slot capacity, and aspect ratio together; never let mood binding alone override layout intent.
- Implement provider-aware aspect handling: request the closest source ratio, then use intentional smart crop/outpaint/background extension rather than blanket `contain`. Add golden tests for every supported target.
- Make OpenAI constraints provider-native by merging negative constraints into the instruction where a separate negative prompt is unsupported.

**Exit criteria:** every selected product image reaches the intended provider; no essential reference is silently dropped; all exact assets/text are deterministic; all outputs fill their target canvas without accidental bars.

### Phase 3 — Add an AI creative planner and deliberate variants (complete)

**Goal:** Turn natural language into a coherent, auditable generation plan.

- Add `POST /api/quick-create/plan` using the configured text/vision providers.
- Feed the planner: user request, brand descriptor/palette/voice, selected product metadata, vision descriptions of attachments, output target, and safety/commercial constraints.
- Give the planner the eligible Mood Library catalog with structured recipes, seasonal validity, compatibility, and entitlement state. Return mood recommendations with reasons and confidence.
- Respect explicit mood locks; the planner may recommend but must never silently replace a user-selected mood.
- Return validated JSON, not free-form prose. Keep user words and facts separate from AI-inferred suggestions.
- Detect contradictions and ask at most one high-value clarification; otherwise choose sensible defaults and show them as editable chips.
- Compile provider-specific prompts from the structured plan. Do not concatenate JSON-like control dumps into a generic prompt.
- Create one `VariantSpec` per sample with a distinct composition/camera/lighting/art-direction axis. Pass variant index and seed, while locking identity, claims, exact copy, and selected constraints.
- Snapshot the selected mood version into every variant. Keep mood constant across variants unless the user explicitly chooses Explore moods.
- Persist the plan and prompt metadata per variant, including reference ordering and provider/model.

**Exit criteria:** each sample has an explainable creative direction; variants are visibly distinct without changing locked facts; prompts can be reproduced per variant.

### Phase 4 — Rebuild the Quick Create UI (implemented; manual release QA pending)

**Goal:** Replace the long form with an intent-first, progressive workflow.

- Build a composer-first screen with drag/drop attachments and Brand, Product, Format, and Direction chips.
- Add a Mood chip with Just my brand, AI suggested, selected mood, and Explore moods states; open the existing visual library from this chip.
- Upgrade the mood browser with recommendation reasons, influence control, compatibility indicators, seasonal grouping, and clear locked/entitlement states.
- Auto-select the sole brand or most recently used brand/product/format, but make the choice explicit and reversible.
- Replace the campaign-detail section with optional, AI-extracted one-off overlay copy. Link users who need multi-asset planning to `/campaigns/new`.
- Put advanced composition, reference strength, quality/model, and prompt inspection in an Advanced drawer.
- Correct media terminology: distinguish image, story/reel cover, and actual video.
- Show the AI plan/direction cards compactly, with inline corrections before spending credits.
- Save an autosaved local/server draft so navigation does not discard work.
- Generate directly and show progress/results within the creation workspace.
- Meet keyboard, focus, screen-reader, mobile layout, and reduced-motion requirements.

**Exit criteria:** the default path from idea to generation requires one brief plus at most one explicit correction; advanced controls do not obstruct the fast path.

### Phase 5 — Add quality evaluation and refinement

**Goal:** Prevent irrelevant results and make correction conversational.

- Run post-generation vision checks for intent similarity, product identity, missing/extra subjects, crop, packaging distortion, brand fit, safe-zone compliance, text artifacts, and overlay legibility.
- Score mood adherence against the snapshotted recipe and approved reference assets, while keeping it separate from brand compliance and intent relevance.
- Store per-dimension scores and reasons per variant.
- Automatically reject/retry only hard failures, within an explicit retry and credit policy; rank soft failures lower rather than hiding them.
- Add thumbs up/down and structured rejection reasons such as “wrong product,” “not my idea,” “bad composition,” “brand mismatch,” and “text problem.”
- Add refinement requests with locks: change background only, keep product exact, preserve composition, replace copy, or use another result's visual treatment.
- Allow mood-only refinements and mood locks without rebuilding product, copy, or layout context.
- Surface regeneration with a changed variant spec; do not simply enqueue the same generation state again.
- Initialize the exact-text editor from stored overlay values rather than hard-coded sample copy.

**Exit criteria:** failed relevance/identity checks are visible and actionable; a user can correct a result without rebuilding the whole request.

**Implemented policy:** every Quick Create variant is vision-scored after final rendering. A clearly
hard identity/subject/crop/packaging/text-artifact failure is regenerated once using a new seed and
the original reservation, so the retry costs the user zero additional credits. A second hard
failure remains visible and ranks last instead of entering an unbounded retry loop. When automated
vision is unavailable (including offline mock mode), QA is marked unavailable rather than inventing
a score.

### Phase 6 — Rollout and cleanup

**Goal:** Ship based on acceptance quality, not only code completion.

- Run the evaluation set across supported providers and aspect ratios.
- Compare V2 with the current flow using accepted/downloaded-result rate, rejection reasons, refinements per accepted result, latency, and credits per accepted result.
- Roll out by workspace cohort; retain a short-lived V1 fallback switch.
- After stable adoption, delete the replaced V1 Quick Create state and obsolete prompt/template branches. No historical Campaign Builder adapter is required for this new project.
- Document model/provider capability matrices and prompt/renderer template compatibility.

**Implemented rollout controls:** `QUICK_CREATE_V2_ENABLED` is the kill switch and
`QUICK_CREATE_V2_ROLLOUT_PERCENT` assigns a stable 0–100 workspace cohort. See
`docs/quick-create-capability-matrix.md`. V1 deletion is deliberately blocked until the controlled
evaluation passes and stable adoption data is available.

## Proposed acceptance criteria

These are release targets and should be adjusted after Phase 0 establishes the baseline.

- 100% of selected saved products with usable assets send an explicit product-identity reference; otherwise generation is blocked with a useful message.
- 0 submissions can start with a pending or failed required upload.
- 0 exact logos, certifications, QR codes, prices, or legal copy are delegated to image-model reproduction.
- 100% of requested output dimensions are exact and pass a no-accidental-bars visual check.
- 100% of collected overlay fields either render correctly or are not offered.
- Every multi-sample request stores a distinct `VariantSpec`, prompt, seed, references, and QA result per variant.
- Every mood-backed variant stores the exact mood version, influence, selection source, applied recipe fields, reference IDs, and mood-adherence score.
- Explicitly selected moods are never replaced by the planner; incompatible mood/format combinations are resolved before credits are spent.
- No provider silently drops an essential reference or unsupported prompt constraint.
- Product-identity and intent-relevance pass rates meet agreed evaluation thresholds before V2 becomes the default.
- Campaign creation has one entry point: `/campaigns`; Quick Create has no legacy campaign tab.

## Test plan

### Unit

- V2 contract validation and V1 compatibility parsing
- creative-plan JSON validation and clarification rules
- mood eligibility, recommendation, version snapshot, influence, locking, and precedence rules
- typed asset/reference selection and ordering
- provider capability routing and negative-constraint translation
- deliberate variant generation and locked-field invariants
- overlay slot mapping for every supported exact field
- output/source aspect strategy

### Integration

- saved product -> product asset snapshot -> worker reference
- upload claim success/failure and submit gating
- selected layout -> matching renderer template
- selected mood + layout + aspect ratio -> compatible bound template
- curated mood asset -> typed style reference -> capable provider
- exact asset overlays and correct brand ownership
- per-variant prompt/QA persistence
- retry/credit idempotency

### Visual regression

- every aspect ratio and social safe zone
- long/short/no overlay copy
- transparent and opaque product assets
- logo and certification placement
- no bars, accidental crop, or hidden product edges

### End-to-end

- idea-only generation
- saved-product generation
- uploaded-product generation
- one-off promotion with exact copy
- brand and mood selection
- AI mood recommendation, explicit mood lock, Just my brand, Explore moods, and mood-only refinement
- incompatible aspect ratio, seasonal recommendation, and entitlement behavior
- failed upload recovery
- generation, feedback, constrained refinement, and export
- `/generate?mode=campaign` redirect to `/campaigns/new`

### Model evaluation

Use a fixed, versioned brief/reference set and blind human review alongside automated vision scoring. Track quality by provider, model, format, reference count, product category, and prompt-plan version. Do not treat job completion as output success.

## Remaining delivery order

1. ~~Fix product/reference grounding, exact overlays, template selection, and aspect handling.~~ Complete.
2. ~~Establish per-variant metadata and add it to the existing evaluation foundation.~~ Complete.
3. ~~Add the structured creative planner and deliberate variant strategy, including Mood Library recommendation and version snapshots.~~ Complete.
4. ~~Ship the composer-first UI and upgraded Mood Library browser behind the V2 feature flag.~~ Implemented; manual release QA remains.
5. ~~Add refinement, automated QA, feedback, and staged rollout controls.~~ Implemented.
6. Run the controlled real-provider evaluation, raise the rollout cohort only after the acceptance gates pass, and delete V1 only after stable adoption.

Grounding and deterministic output remain the highest-value quality work and should land before the visual redesign; otherwise the new UI would continue sending incomplete and misleading inputs to the same inaccurate pipeline.
