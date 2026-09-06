# Campaign Builder v2 — Research & Design

**Status:** Design for review
**Date:** 2026-08-22
**Branch context:** `redesign-2026`
**Supersedes:** the placeholder scope in `plans/slice-57-campaign-builder-prompt-templates.md`
**Resurrects:** `plans/slice-55-output-packages-and-quality-checks.md` (never implemented — see §2.4)

---

## 0. Summary

Campaign Builder is currently a **wizard-shaped skin over Quick Create**. It collects more fields across eight steps and then emits the byte-identical single-generation payload that Quick Create emits. It produces one image set, for one format, with no campaign object behind it. Everything that makes it read as "campaign" in the UI — the creation types, the multi-format picker, the consistency selector — is inert.

This document removes that mock and designs the real thing.

The design rests on one product idea and one architectural idea.

**The product idea:** a campaign is not a bigger generation, it is a **plan**. A small business does not want twelve images; it wants to know what to post, on which day, on which platform, with which words, for the next three weeks — and to have all of it made for them, on brand, in one sitting. Every competitor either generates assets without a plan (AdCreative, Predis) or plans without generating on-brand assets (Buffer, Later, HubSpot). Owning both halves is the wedge.

**The architectural idea:** campaign consistency comes from a **style contract anchored to one approved image**, not from templates. The user approves one hero still; every other asset in the campaign — every format, every phase, every video — is generated with that still as an image-to-image reference under a frozen style contract. The routing layer already promotes to an i2i-capable model when a reference is present (`packages/gateway/src/routing.ts`). This is the mechanism template-based tools structurally cannot copy, and it is also — per the 2026 practitioner consensus — the only reliable way to keep a product identical across video shots.

Video lands on the same rail: an approved still is the first frame. Brand fidelity is inherited, not re-attempted.

**Decisions taken (confirmed with product owner, 2026-08-21):**

| Decision | Choice |
|---|---|
| End of flow | Dated calendar + export. No OAuth publishing. Publishing is a clean Phase 5 seam. |
| Video depth | Design both single-clip and multi-scene storyboard in one data model; ship single-clip first. |
| Copy | In scope. Captions, hooks, hashtags, CTAs are part of the campaign deliverable. |
| Build order *(2026-08-22)* | **UI first, screen by screen.** Each screen: build the UI against a fixture → confirm it in the running app → build its backend → wire it. Starting with Brief. See §6.1. |

---

## 1. What exists today — audit

All line references verified against the working tree on `redesign-2026`.

### 1.1 The UI is a wizard with no engine behind it

`apps/web/components/generate/commercial/campaign-builder.tsx` (186 lines) renders an eight-step stepper over step components, then hands control back to `generate-shell.tsx`, which builds **the same `GeneratePayload` as Quick Create** and posts it to the same endpoint. The only difference on the wire is `mode: "campaign_builder"`.

### 1.2 The backend does not distinguish campaign mode

| Location | Behaviour |
|---|---|
| `apps/worker/src/handler.ts:112` | maps `campaign_builder` → the quick normalizer |
| `apps/worker/src/handler.ts:361, 406` | `quick` and `campaign_builder` take the identical branch |
| `packages/shared/src/prompt-templates/router.ts:50` | accepts `campaign_builder`, then routes into the four `quick.*` templates |

There is no campaign prompt path, no campaign template, no campaign persistence. `mode` is carried through the whole stack and never read for a decision.

### 1.3 Three enums are decorative

**`creationType`** — six values (`single_product`, `product_bundle`, `campaign_set`, `leaflet_catalogue`, `comparison`, `social_ad_pack`) defined in `packages/shared/src/generation/commercial-contract.ts:8`. Grep shows no branch anywhere in `packages/` or `apps/` keys off it. Choosing "Leaflet / catalogue" and choosing "Single product" produce identical output.

**`outputs.formats`** — the UI presents a multi-select of 21 formats. `commercial-contract.ts:259` resolves the output target as `OUTPUT_FORMAT_TARGETS[parsed.outputs.formats[0]!]`. Only the first selection is ever used, and `generate-shell.tsx:123` already truncates the array to one element before sending. The multi-format promise is not partially implemented; it is unimplemented.

**`outputs.consistency`** — `off | same_mood | strict_campaign`. The only occurrence outside type declarations is `handler.ts:145`, where the legacy path hardcodes `"off"`. Never read.

### 1.4 One generation is one image size

`GenerationApi.buildPlan` (`packages/api/src/generation.ts:317`) resolves exactly one `ResolvedOutputTarget` and fans out `requestedVariants` (max 4) *samples of that one target*. There is no grouping row: `plans/slice-55-output-packages-and-quality-checks.md` specified a `generation_packages` table, but migrations stop at `0019` and no `generation_packages` symbol exists in the tree. Slice 55 was planned and never built. Campaign Builder needs it, so this design absorbs it.

### 1.5 There is no video anywhere

`packages/gateway/src/types.ts` declares `ImageProvider`, `TextProvider`, `VisionProvider`, `ModerationProvider`. No video interface, no video provider, no `ffmpeg` dependency in any `package.json`. `packages/renderer` is Satori-with-Puppeteer-fallback and emits `pngBytes` only (`packages/renderer/src/types.ts`).

Note the sharp edge: `PLATFORM_FORMATS` already advertises `instagram/reel`, `instagram/feed_video_portrait`, `instagram/feed_video_square`, and `tiktok/video`. Selecting any of them today produces **a still image at video dimensions**. That is a correctness bug in the current product, not only a missing feature.

### 1.6 What is genuinely good and must be kept

- **Brand fidelity by construction.** The model generates a background; the renderer composites the real logo, real brand fonts, and real palette as an overlay. The model never interprets the logo. This is the product's moat and the campaign design inherits it wholesale.
- **The prompt-template system** (`packages/shared/src/prompt-templates/`) — YAML templates, versioned, with `variables.required` validation, `safety_rules`, and an `overlay_contract` splitting renderer-owned from model-owned elements. It is a clean base to extend; it needs campaign templates, not a rewrite.
- **The i2i promotion in `routing.ts`.** `chooseProvider` already substitutes an i2i-capable model when a reference image is present. The style-anchor mechanism in §4 is built directly on it.
- **The overlay slot contract** (`PromptOverlaySlots`) — headline, subtitle, price, discount, badge, CTA, legal, website, phone, QR. Already the right vocabulary for offer-driven campaigns.
- **`captionJobs` + the Anthropic text provider** — the copy engine in §3.8 is largely a matter of wiring what exists to a campaign-shaped prompt.

---

## 2. Research

### 2.1 What a small business campaign actually is

The unit of work an SMB thinks in is not "an image". It is "the thing we are doing for the next few weeks". Three findings shape the design.

**Campaigns have phases, and the phases have different jobs.** The launch literature converges on the same shape: pre-launch builds context and collects signal; launch week makes the offer obvious and removes friction; post-launch answers objections with testimonials, demos, and usage proof to hold momentum after the announcement spike decays. The recurring asset list is stable — teaser clips, product walkthroughs, founder notes, customer quotes, comparison images, short demos, FAQ cards, proof posts. **This list is generatable.** It is the single highest-leverage thing we can encode.

**Always-on content has a different, also-stable shape.** The Hero–Hub–Hygiene model (originally YouTube/Google) sets the cadence: hero moments 2–4× a year around launches and seasonal events; hub content 1–4× a month; hygiene content weekly or biweekly answering known questions. A business that is not launching anything still needs a campaign object — it is just a different recipe.

**Consistency is the stated top pain, and it is an execution problem, not an intent problem.** SMB owners are running the business; posting slips. Sprout Social's benchmark work has 67% of SMBs describing their social effort as "posting into the void", over 91% of social professionals naming content creation and strategy as a negative part of the role, and over 75% reporting they are expected to do too many unrelated things at once. Reported effects of inconsistent posting run to a 61% engagement penalty versus a regular schedule.

The read: **the bottleneck is not idea generation, it is production volume at acceptable quality.** A tool that produces three weeks of finished, dated, on-brand posts in one sitting attacks the actual constraint. A tool that produces four beautiful images does not.

### 2.2 The competitive field

| Product | Shape | Where it stops |
|---|---|---|
| **Canva Magic Studio** | Manual composition with AI assists. Enormous template library. | Composition-driven. The user still assembles. No campaign object, no plan, no phase logic. |
| **Predis.ai** | Social-first SMB all-in-one: post generation, video/UGC ad maker, scheduler, competitor analysis, Shopify sync. Closest in shape to us. | Post-at-a-time. Generates a post from a prompt; there is no campaign spine tying twenty posts to one visual and narrative direction. Brand fidelity is approximate. |
| **AdCreative.ai** | Paid-ads engine. Creative Scoring AI trained on ~450M ads, 340 data points, claimed >90% accuracy on predicted performance. Direct Meta/Google integration. | Template-composited, not generative. Scoring is real value but the creative is banner-shaped. Built for performance marketers and agencies, not for a shop owner. |
| **HubSpot Campaign Assistant / StoryLab / Writesonic** | Brief → multi-channel **copy** (emails, ads, landing pages, social). | Copy only. No brand-exact visual output. |
| **Buffer / Later / Metricool / Hootsuite** | Calendar, scheduling, analytics. | Planning without production. The user still has to make every asset elsewhere. |
| **Meta Advantage+ / TikTok Smart+** | Platform-native automation of creative, targeting, and bidding. TikTok's Symphony feeds Smart+ for continuous creative refresh; Automatic Enhancements will resize, refresh music/hooks, and dub into 50+ languages in one click. | **This is the one to take seriously.** But: it is per-platform, it only optimises assets you already have (or creator content it auto-selects), it is confined inside an ad account, and Meta's variant is widely described as all-or-nothing with little creative control. It optimises paid delivery. It does not plan your organic month, and it does not enforce *your* brand. |

**The gap, stated plainly.** Nobody owns *brief → dated multi-phase plan → brand-exact assets in every format, image and video → export*. The planners don't produce. The producers don't plan. The platform tools only optimise inside their own walls. The ad tools use templates and therefore cannot hold a distinctive visual identity across twenty assets.

**Our defensible position:** we already enforce brand by construction — logo placed by the renderer, brand fonts rendered by the template engine, palette as tokens — and the model never touches them. Layer the plan on top of that and the combination is not something a template-based competitor can reach without rebuilding their rendering stack.

### 2.3 Video — state of the art, and what it means for us

**The market consolidated in 2026.** Following Sora's closure in March 2026 the field is effectively Veo 3.1, Kling 3.0, Seedance 2.x, and Runway Gen-4.5.

Indicative API pricing:

| Model | Cost | Notes |
|---|---|---|
| Veo 3.1 Lite | ~$0.05/sec | cheapest paid tier, no audio |
| Kling 3.0 / Seedance 2.0 | ~$0.09–0.14/sec | best cost/quality for product motion |
| Veo 3.1 Fast | ~$1.50/clip (~$0.75 per 5s w/ audio) | **only model in tier shipping native audio** |
| Veo 3.1 Standard | ~$0.40/sec (~$2.00 per 5s) | premium |
| Runway Gen-4.5 | ~$1.50/clip | strongest controls: reference images, camera control, consistent subjects |

A typical 5-second marketing clip lands at **$0.45–0.70** on Kling/Seedance, **$0.75** on Veo Fast with audio. Commercial use is permitted on paid plans across Veo, Kling, and Runway; Runway's *free* tier does not grant it.

**The critical finding for our architecture.** Practitioner consensus in 2026 is unambiguous: *storyboard every hero shot as a still first, lock the product's shape and detail there, then feed those frames into image-to-video — never ask the model to invent the product on the fly.* An image-to-video reference locks identity, style, and framing from frame one. Seedance 2.0 and Digen ship this as productised "Identity Lock" / "Style Lock" features precisely because drift is the failure mode everyone hits.

**Read that against our stack.** We *already* produce a locked, brand-exact still: model-generated background plus renderer-composited real logo and real brand type. That still is the ideal first frame. Our video story is not "add a video model" — it is **"animate the thing we already got right."** Product identity cannot drift because the product is in frame zero and the brand elements are composited, not generated.

**What wins in-feed** (this drives the storyboard templates in §3.5):

- Short-form vertical video is the dominant format — roughly 78% of top-performing campaigns across Meta, TikTok, and Google; 60% of marketers make it their primary format.
- **7–15 seconds for cold traffic**, with the hook landing inside the first 3 seconds. 6-second cuts deliver roughly 60% of a 30-second ad's impact. Warm audiences (page visitors, cart abandoners) tolerate 30–60 seconds for objection handling and social proof.
- **85% of Meta video views happen with sound off.** Assets without captions or on-screen text lose most of their audience by the 2-second mark. **Burned-in captions are not a nice-to-have; they are the format.** Our renderer already owns text — this is a direct advantage.
- The reliable faceless structure is four beats: **negative hook → product reveal → value → CTA**, cut fast to a music bed.
- Founder-led content reports ~4.6× ROAS against ~3.1× for product-only creative; authentic UGC-style outperforms polished by ~43% on TikTok/Reels. Worth noting for a later avatar/UGC phase; explicitly out of scope for Phases 1–4.

**Multi-model routing is the norm, not an optimisation.** The teams getting results in 2026 route different jobs to different models by need and budget. Our `VideoProvider` abstraction (§4.5) mirrors `ImageProvider` for exactly this reason.

---

## 3. Product design

### 3.1 Positioning

> **Quick Create makes a post. Campaign Builder makes a month.**

One brief in. Out comes a dated plan with every asset made — stills and video, every format, every platform, all visibly one campaign — plus the words to post them with.

### 3.2 The core object

A **Campaign** is a first-class, persistent, resumable workspace entity. Not a form submission.

```
Campaign
├─ brief, goal, audience, duration, platforms
├─ brand + products (roles)
├─ StyleContract        ← frozen after hero approval; the consistency mechanism
├─ Phase[]              ← tease / launch / proof / offer / last-call
│   └─ Slot[]           ← one planned asset
│        ├─ kind        image | video
│        ├─ format      platform + format → exact px
│        ├─ angle       the job this asset does
│        ├─ Copy        caption, hook, hashtags, CTA
│        ├─ scheduledAt
│        └─ Generation? ← attached when produced
└─ exports
```

The Slot is the pivot. A slot exists as a *plan* before it exists as an *asset*: the user sees the full campaign laid out, priced, and editable before a single credit is spent. That property — see the whole plan, then commit — is what separates a professional tool from a slot machine, and it is why the campaign object cannot be a form submission.

### 3.3 The five stages

Not a wizard. Five stages, each independently revisitable, with the campaign persisted continuously.

**1 · Brief** — one screen. Goal (launch / promotion / seasonal / always-on / catalogue / ad test), products, brand, duration, platforms, and 1–3 sentences of intent. Optional: offer terms, deadline. Nothing else. Everything else is inferred and then shown for editing.

**2 · Plan** — the AI proposes the campaign. Phases with dates, and inside each phase a set of slots with an angle, a format, a kind, and draft copy. Rendered as a calendar and as a list. Fully editable: add, remove, reorder, retype, redate a slot. **No generation has happened yet; total credits are shown.**

This screen is the product. It is what nothing else in the category does.

**3 · Look** — the campaign's visual direction, decided once. Mood, composition, background family, realism, template family. The system generates **3–4 hero candidates** for the campaign's most important slot. The user picks one. That approval freezes the **StyleContract** and stores the chosen image as the **style anchor**. Cost of this stage is one small generation, not the campaign.

**4 · Board** — production. Every slot renders as a card in a phase-grouped board. Generate a slot, a phase, or everything. Each result is anchored to the style anchor, so the board fills in visibly as one campaign. Per-card actions: regenerate, alternates, edit copy, swap format, promote to video, approve. Approval is explicit — a campaign has an approved set and a working set.

**5 · Deliver** — the campaign export. A dated calendar (CSV/ICS), a per-post copy sheet, and every approved asset named by platform, format, and date. ZIP download. *(Direct publishing is the Phase 5 seam — see §6.)*

### 3.4 Campaign recipes

Recipes replace the inert `creationType` enum with something that actually drives phase structure, slot mix, prompt route, and copy tone.

| Recipe | Phases | Characteristic slot mix |
|---|---|---|
| **Product launch** | tease → launch → proof → last-call | teaser clip, hero reveal, feature cards, demo video, testimonial card, FAQ card, urgency post |
| **Offer / sale** | announce → reminder → last-call | offer hero with price/discount overlay, countdown story, bundle card, expiry post |
| **Seasonal** | build-up → peak → wind-down | seasonal hero, gift-guide carousel, atmosphere clip, closing-hours card |
| **Always-on** | hero / hub / hygiene (cadence, not sequence) | monthly hero, weekly hub posts, FAQ + how-to hygiene cards |
| **Catalogue / leaflet** | single | multi-SKU grid, A4 print leaflet, per-SKU product cards, shelf-talker |
| **Comparison / before-after** | single | split-frame comparison, before→after morph clip, spec table card |
| **Ad test pack** | single | N angles × M formats, matrixed for paid testing, one variable per row |

The last one earns its place on the AdCreative research: a structured **angle × format matrix** with exactly one variable changing per row is what performance marketers actually need, and it is trivially expressible in the slot model.

### 3.5 The Plan engine

Input: recipe, brief, product snapshots, brand voice notes, duration, platforms, offer terms.
Output: a validated JSON campaign plan — phases with date ranges, slots with `{angle, kind, format, durationSec?, copy, scheduledAt, rationale}`.

Implemented as a prompt template in the existing YAML system (`category: plan_generation`), executed through the Anthropic text provider already wired in `packages/gateway/src/providers/anthropic-text.ts`, with a Zod schema on the output. The template encodes the research directly:

- phase archetypes from the launch-framework research (§2.1)
- Hero–Hub–Hygiene cadence for always-on
- **format rules per platform**: vertical 7–15s for cold traffic, 30–60s permitted for warm/objection slots, hook inside 3 seconds
- **every video slot carries burned-in captions by default** (85% sound-off)
- video storyboards use the four-beat structure: negative hook → reveal → value → CTA

Storyboards are generated at plan time as `beats[]` on the slot, so the plan screen shows *what the video will do* before anything is rendered.

### 3.6 The Board

A campaign is a production job, so the board is information design, not document design. Each card carries state in form as well as text: planned / queued / generating / ready / approved / failed. Phase groups show progress and cost. Bulk actions operate on a phase.

The style anchor is pinned in the rail throughout, so the user can always see the thing everything else is matching.

### 3.7 The consistency system — the differentiator

**StyleContract** is frozen at hero approval and is immutable for the life of the campaign (changing it is an explicit, warned action that invalidates the anchor).

```
StyleContract {
  styleAnchorGenerationVariantId   // the approved hero still
  styleAnchorS3Key
  moodId, templateFamily
  composition { background, realism, shadow, brandBlend, ... }
  palette[]                        // resolved, not "the brand's" — the actual pixels used
  seed
  promptStyleClause                // distilled natural-language style statement
  negativeClause
}
```

Every subsequent slot generation carries:

1. the **style anchor as an i2i reference** — `routing.ts` promotes to an i2i-capable model automatically;
2. the frozen **composition + mood + template family**;
3. the distilled **style clause and negative clause**, injected by a new `modifier.campaign_consistency` template;
4. the same **seed** where the provider honours it.

Three consistency levels, and unlike today's dead enum, they map to real behaviour:

| Level | Behaviour |
|---|---|
| `loose` | shared mood and palette only; no anchor reference |
| `matched` *(default)* | anchor as reference + frozen composition |
| `locked` | `matched` + seed pinning + strict negative clause + a post-generation palette-distance check that flags drift on the card |

### 3.8 The copy engine

Every slot gets: **hook** (first line / on-image text), **caption** (platform-length-aware), **hashtags** (platform-appropriate count), **CTA**, and for video **the burned-in caption track**.

Generated with the plan (so the plan screen is not empty), then regenerable per slot. Brand voice comes from `brands.voiceNotes`, already in the schema. This reuses the `captionJobs` pipeline and its credit accounting; the change is a campaign-shaped prompt and a slot-level attachment point rather than a generation-level one.

Copy is editable inline everywhere and is what ends up in the export sheet.

### 3.9 Export

- `calendar.csv` and `calendar.ics` — date, platform, format, angle, filename
- `copy.md` — per-post caption, hashtags, CTA, ready to paste
- `assets/<phase>/<date>-<platform>-<format>.<png|mp4>`
- `campaign.json` — the full campaign, for re-import and for the future publishing phase

---

## 4. Architecture

### 4.1 Data model

New file `packages/db/src/schema/campaign.ts`, new migration `0020_campaigns.sql`.

```
campaigns
  id, workspace_id, brand_id, project_id
  name, recipe, brief, goal, audience
  starts_on, ends_on, platforms jsonb
  status              draft | planned | producing | ready | archived
  style_contract jsonb          -- null until hero approved
  plan_snapshot jsonb           -- last accepted plan, for diffing
  estimated_credits, spent_credits
  created_by_user_id, created_at, updated_at

campaign_phases
  id, campaign_id, kind, name, position
  starts_on, ends_on

campaign_slots
  id, campaign_id, phase_id, position
  kind                image | video
  angle               text          -- 'teaser', 'hero_reveal', 'proof', ...
  output_format       text          -- existing OutputFormat enum
  duration_sec        int null      -- video only
  storyboard jsonb    null          -- beats[] for multi-scene video
  copy jsonb                        -- hook, caption, hashtags[], cta
  scheduled_at
  status              planned | queued | generating | ready | approved | failed
  generation_id       fk null
  selected_variant_id fk null
  estimated_credits

campaign_exports
  id, campaign_id, s3_key, manifest jsonb, created_at
```

`generations` gains nullable `campaign_id` and `campaign_slot_id`, so a campaign generation is still an ordinary generation — history, billing, moderation, and the results view all keep working unchanged.

**This subsumes slice 55.** `generation_packages` as specified there is exactly `campaign_slots` grouped by campaign, with `style_seed`/`style_brief` generalised into `style_contract`. Slice 55 should be closed as superseded rather than built.

### 4.2 Multi-format fan-out — doing it properly this time

Today `formats[]` is a lie (§1.3). The honest implementation:

One slot = one format = one output target. A "post this everywhere" action **expands into sibling slots**, one per format, all sharing the style anchor and the copy. Consequences:

- pricing is honest and per-asset, because each slot is a real generation;
- each format gets a background composed *for its own aspect ratio* rather than a crop, which is the whole point of the no-crop framing rule already enforced in `router.ts` (`NO_CROP_PROMPT_INSTRUCTION`);
- the overlay is re-rendered at native dimensions by the existing renderer, so text is never scaled or resampled;
- the board shows a format family as a grouped card set.

This is more generations than a naive "resize" approach, and that is correct — the alternative is either crops that violate our own framing contract or upscaled overlay text.

### 4.3 Prompt template layer

New template group `campaign/`, discharging the open items in slice 57:

```
templates/campaign/
  launch-teaser.yaml        launch-hero.yaml       launch-proof.yaml
  offer-hero.yaml           offer-urgency.yaml
  seasonal-hero.yaml
  catalogue-grid.yaml       catalogue-leaflet.yaml
  comparison-split.yaml
  ad-angle.yaml
templates/modifiers/
  campaign-consistency.yaml     ← style clause, negative clause, anchor instruction
  video-first-frame.yaml        ← framing rules for a still destined to be animated
templates/plan/
  campaign-plan.yaml            ← category: plan_generation, JSON out
  slot-copy.yaml
```

`routeCampaignPrompt(recipe, angle, kind)` is added alongside `routeQuickCreatePrompt`, sharing the loader, renderer, variable validation, and safety-rule merging. Required-variable validation per route is where slice 57's validation item is satisfied.

`PromptTemplateSchema.category` extends from `image_generation | modifier` to add `video_generation` and `plan_generation`.

### 4.4 Generation flow

```
POST /api/campaigns                  → create from brief
POST /api/campaigns/:id/plan         → run plan engine, upsert phases + slots
POST /api/campaigns/:id/hero         → generate 3–4 hero candidates
POST /api/campaigns/:id/style        → approve candidate, freeze StyleContract
POST /api/campaigns/:id/generate     → { scope: all | phase | slot[] } → enqueue
GET  /api/campaigns/:id              → campaign + phases + slots + generations
POST /api/campaigns/:id/export       → build ZIP, return signed URL
```

Slot generation reuses `GenerationApi.create` with `campaignId`/`campaignSlotId` set and the style anchor injected as an inspiration reference. **No fork of the generation pipeline.** Preflight, pricebook, ledger reserve/commit/release, moderation, and the fan-in all apply unchanged.

Campaign-level enqueue is a batched dispatch with a concurrency cap; `packages/api/src/concurrency.ts` already exists for this.

### 4.5 Video pipeline

**Gateway.** New interface in `packages/gateway/src/types.ts`, mirroring `ImageProvider`:

```ts
export interface VideoProviderCapabilities {
  modelCodes: string[];
  supportsImageToVideo: boolean;
  supportsNativeAudio: boolean;
  maxDurationSec: number;
  tier: "fast" | "premium" | "fallback";
}

export interface VideoProvider {
  capabilities: VideoProviderCapabilities;
  generate(req: AIVideoRequest): Promise<AIVideoResponse>;  // async job + poll
}
```

`chooseVideoProvider` mirrors `chooseProvider`, routing on duration, native-audio need, and tier — the multi-model routing the research says is standard practice. Initial registry: Kling/Seedance as the default cost tier, Veo Fast where native audio is wanted, Runway where camera control matters. Mock provider first, exactly as `packages/gateway/src/mock.ts` does for images, so `AI_MODE=mock` development keeps working.

**Renderer.** One focused change: make `RenderInput.background` optional so the renderer can emit a **transparent-alpha overlay PNG**. Text, logo, price badges, and CTA are then composited over video with ffmpeg — identical typography, identical brand fidelity, no second text engine.

**Composition.** Add `packages/renderer/src/video.ts` wrapping `ffmpeg`:

- overlay alpha PNG over clip
- burn in the caption track (research: 85% sound-off)
- concat beats with cuts, for storyboards
- mix a music bed, optional TTS voiceover
- encode per-platform (H.264/AAC, faststart, platform bitrate targets)

ffmpeg becomes a worker dependency (container layer, not npm).

**Phase A — single clip** *(ships first)*

```
approved still ──► i2v provider ──► 3–8s clip ──► ffmpeg: alpha overlay
                     (still = frame 0)              + captions + encode ──► MP4
```

Product identity cannot drift; brand elements are composited, never generated. This is the cheapest, safest, highest-confidence path and it immediately fixes the §1.5 correctness bug where reel/TikTok formats silently return stills.

**Phase B — multi-scene storyboard** *(same data model, later slice)*

```
slot.storyboard.beats[] ──► still per beat (all anchored to style anchor)
                       ──► clip per beat
                       ──► ffmpeg concat + captions + music (+ voiceover)
                       ──► 15–30s ad
```

`storyboard jsonb` on `campaign_slots` is designed now and populated by the plan engine from the outset, so Phase B is additive: no schema change, no API change, no re-plan.

### 4.6 Credits

`price_book_entries` currently keys on `(model_code, size_bucket, premium_flag, has_inspiration_flag)`. Video needs two more columns:

- `media_kind` — `image | video`, defaulting to `image` so every existing row is untouched
- `duration_bucket` — `null | short (≤8s) | standard (≤15s) | long (≤30s)`

Campaign-level estimation aggregates slot estimates and is shown on the **Plan** screen before commitment, with per-phase breakdown and partial commit (generate one phase, see it, continue). Given a 5s clip costs roughly $0.45–0.75 at provider prices, video credit multipliers must be set deliberately — a video slot is meaningfully more expensive than an image slot and the UI must never let that be a surprise.

---

## 5. Removal list

Delete outright — nothing else imports them (verified by grep across `apps/` and `e2e/`):

| File | Lines |
|---|---|
| `apps/web/components/generate/commercial/campaign-builder.tsx` | 186 |
| `apps/web/components/generate/commercial/campaign-details-step.tsx` | 146 |
| `apps/web/components/generate/commercial/composition-step.tsx` | 144 |
| `apps/web/components/generate/commercial/output-settings-step.tsx` | 117 |
| `apps/web/components/generate/commercial/brand-mood-step.tsx` | 102 |
| `apps/web/components/generate/commercial/template-layout-step.tsx` | 52 |
| `apps/web/components/generate/commercial/creation-type-step.tsx` | 33 |
| **Total** | **780** |

`product-step.tsx` **stays** — Quick Create imports it.

Modify:

- `generate-shell.tsx` — remove the mode tabs and all `campaign_builder` branching (lines ~120–130, 254–265, 388, 424–426). `/generate` becomes Quick Create only; Campaign Builder gets its own route.
- `apps/web/components/results/generation-view.tsx:825` — replace the `isCampaignBuilder` check with campaign-slot awareness.
- `packages/shared/src/generation/commercial-contract.ts` — retire `creationType` and `outputs.consistency` from the *quick* contract; `outputs.formats` collapses to a single format, matching what the code has always actually done.
- Sidebar/nav — Campaign Builder becomes a top-level destination, not a tab.

No tests reference the deleted components (`apps/web/tests`, `e2e` both clean), so removal is low-risk. `plans/slice-55-*.md` and `plans/slice-57-*.md` should be marked superseded by this document.

---

## 6. Delivery plan

### 6.1 How we build — the increment rule

Every screen is built in **four steps, in this order**. A step does not start until the previous one is signed off.

```
  A · UI            build the screen against a local fixture. No API, no DB.
                    Every control works; state lives in React.
        ↓
  B · Confirm       walk the screen together. Change what's wrong now,
                    while it is still only markup.
        ↓
  C · Backend       schema + migration + queries + API for THIS screen only.
                    Tested independently of the UI.
        ↓
  D · Wire          replace the fixture with real calls. Loading, empty,
                    and error states become real.
```

Then move to the next screen. **We do not build a table until the screen that needs it is confirmed.** The data model in §4.1 is the destination, not the first commit — it arrives one screen at a time.

Two rules that keep this honest:

1. **The fixture is a typed export, not scattered literals.** Each screen gets `fixtures.ts` exporting data shaped exactly like the eventual API response. Step D deletes the fixture file and nothing else moves.
2. **Step A screens are reachable in the running app** — real route, real shell, real nav. Not Storybook, not a scratch page. You click Campaigns in the sidebar and it is there.

### 6.2 Screen order

Brief → Plan → Look → Board → Deliver. Then video, which is not a screen but a capability that adds to Plan, Board, and Quick Create.

| # | Slice | Steps | Notes |
|---|---|---|---|
| **59** | Demolition & route shell | A only | No backend. Nothing to confirm beyond "the old thing is gone and the new route exists". |
| **60** | **Brief screen** | A → B → C → D | First screen. C creates `campaigns` + migration `0020`. |
| **61** | Plan screen | A → B → C → D | C creates `campaign_phases` + `campaign_slots` + the plan engine. |
| **62** | Look screen | A → B → C → D | C adds `style_contract` and hero generation. |
| **63** | Board screen | A → B → C → D | C adds slot dispatch and status polling. |
| **64** | Deliver screen | A → B → C → D | C adds `campaign_exports` and the ZIP builder. |
| **65** | Campaign prompt routes | C only | Backend-only upgrade. No new screen. |
| **66** | Video I — motion clips | A → B → C → D | Touches Plan, Board, and Quick Create. |
| **67** | Video II — storyboards | A → B → C → D | |
| **68** | Publishing | — | Deferred by decision. |

---

### Slice 59 — Demolition & campaign route shell

**Step A only. No backend, no confirm gate — this is a clearing operation.**

**Delete** (verified unimported; see §5):

```
apps/web/components/generate/commercial/campaign-builder.tsx
apps/web/components/generate/commercial/campaign-details-step.tsx
apps/web/components/generate/commercial/composition-step.tsx
apps/web/components/generate/commercial/output-settings-step.tsx
apps/web/components/generate/commercial/brand-mood-step.tsx
apps/web/components/generate/commercial/template-layout-step.tsx
apps/web/components/generate/commercial/creation-type-step.tsx
```

Keep `product-step.tsx` — Quick Create imports it.

**Modify**

- `generate-shell.tsx` — strip the mode tabs and every `campaign_builder` branch (~lines 120–130, 254–265, 388, 424–426). `/generate` becomes Quick Create only; drop the `?mode=` URL sync.
- `apps/web/components/results/generation-view.tsx:825` — remove the `isCampaignBuilder` check for now; campaign-slot awareness returns in slice 63.
- `apps/web/components/app/sidebar.tsx` — add **Campaigns** as a second primary destination directly under Quick Create, using the existing `navbtn` treatment (`bg-white shadow-card`, active = `bg-ink-deep text-white shadow-pill-dark`). Rename the existing Generate label to **Quick Create**.

**Create**

```
apps/web/app/(app)/campaigns/page.tsx            list + empty state
apps/web/app/(app)/campaigns/[id]/page.tsx       the campaign workspace
apps/web/components/campaign/stage-rail.tsx      Brief · Plan · Look · Board · Deliver
apps/web/components/campaign/campaign-shell.tsx  holds stage state, renders the active screen
apps/web/components/campaign/types.ts            the client-side campaign types
```

`campaign-shell.tsx` holds `activeStage` in `useState` and renders a placeholder per stage. The stage rail is fully working from day one — it is the spine every later slice hangs off.

**Done when:** the old builder is gone, `pnpm typecheck` passes, `/campaigns/new` renders the shell with a working five-stage rail, and Quick Create is untouched in behaviour.

---

### Slice 60 — Brief screen  ← **start here**

#### 60·A — UI

**Create**

```
apps/web/components/campaign/brief/brief-screen.tsx
apps/web/components/campaign/brief/recipe-picker.tsx
apps/web/components/campaign/brief/platform-toggles.tsx
apps/web/components/campaign/brief/offer-fields.tsx
apps/web/components/campaign/brief/fixtures.ts
```

**Reuse, do not rebuild:** `product-picker.tsx` and `product-step.tsx` for product selection, `mood-picker-dialog.tsx` patterns for any modal, and the existing brand-loading in `app/(app)/generate/page.tsx` as the model for how brands reach the client.

**The form state** (this is the shape `POST /api/campaigns` will take in 60·C — keep them identical):

```ts
interface CampaignBriefDraft {
  name: string;
  recipe: "product_launch" | "offer" | "seasonal" | "always_on"
        | "catalogue" | "comparison" | "ad_test_pack";
  brandId: string;
  productRefs: SelectedProduct[];        // existing type from commercial/types.ts
  platforms: Platform[];                 // existing type from shared/output-targets
  startsOn: string;                      // ISO date
  endsOn: string;
  brief: string;
  goal?: string;
  audience?: string;
  offer?: { discount?: string; code?: string; expiresAt?: string };
}
```

**Controls**

- Campaign name — text.
- Recipe picker — seven cards, single-select. Each card shows its **phase shape** (`tease · launch · proof · last-call`), because that is what the choice actually changes.
- Brand — select, defaults to the workspace's only brand when there is one.
- Products — chips with thumbnails, add/remove, via the existing picker.
- Platforms — multi-select pills.
- Date range — start + end, with a derived duration pill.
- Brief — textarea, 1–3 sentences of intent.
- Offer — discount, code, expiry. **Shown only for `offer` and `product_launch` recipes.**

**Right rail** — brand summary with palette swatches and the "logo, fonts and palette are placed by the renderer, never generated" line; plus a *What you'll get* estimate block reading from the fixture.

**Validation** — inline, live: name non-empty, brand set, ≥1 product (except `always_on`), ≥1 platform, end after start, brief ≥ 20 characters. The primary button is disabled with a reason until valid.

**Reference:** the mockup at `https://claude.ai/code/artifact/1e245512-1918-4c3f-895b-e7105f4f7e50` (Brief tab) is the visual target. It is built on the real tokens — `#f7f2e9` frame, `#fffdf9` canvas at `24px`, violet `#5e5ce6`, `.btn` pills at 36px/`999px` — so lift spacing and treatment from it directly.

**Done when:** `/campaigns/new` renders the Brief screen, every control works against local state, validation is live, and "Build the plan" logs the assembled `CampaignBriefDraft`.

#### 60·B — Confirm

Walk it. Open questions to settle at this gate:

- Are seven recipes right, or is that too many for a first screen?
- Should brand be on this screen at all, or inherited from workspace context?
- Is the offer block in the right place, or does it belong on Plan next to the slots that use it?
- Does the duration control want presets (1 week / 2 weeks / 1 month) rather than two date pickers?

#### 60·C — Backend

**Create**

```
packages/db/src/schema/campaign.ts
packages/db/src/migrations/0020_campaigns.sql
packages/db/src/queries/campaign.ts
packages/api/src/campaign.ts
packages/api/src/campaign.test.ts
apps/web/app/api/campaigns/route.ts            POST create, GET list
apps/web/app/api/campaigns/[id]/route.ts       GET one, PATCH update
```

**Modify:** `packages/db/src/schema/index.ts`, `packages/db/src/index.ts` (export the new queries — note the existing file exports each query module explicitly).

**This slice creates only the `campaigns` table** — the columns in §4.1 down to `estimated_credits`, with `style_contract` and `plan_snapshot` nullable and unused for now. Phases and slots arrive in 61·C.

**Follow the existing conventions exactly:**

- Migration must include RLS, matching the pattern in `0008_product_workspace.sql`:
  ```sql
  ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
  ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
  CREATE POLICY campaigns_tenant_isolation ON campaigns
    FOR ALL TO app_user
    USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
  CREATE POLICY campaigns_admin_bypass ON campaigns FOR ALL TO app_admin USING (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO app_user;
  ```
- Queries wrap in `withWorkspace(db, workspaceId, tx => …)` — see `queries/project.ts`.
- Route handlers use `getSessionWorkspace()` from `@/lib/auth/server` and `createDb(loadConfig().db.url, "app_user")` — see `app/api/projects/route.ts`.
- Zod schema for the brief input lives in `packages/shared/src/campaign/brief-contract.ts`, mirroring how `generation/commercial-contract.ts` is organised.

**Done when:** `pnpm db:migrate` applies cleanly, `pnpm test` passes with coverage on create/read/update and workspace isolation, and the endpoints work against `curl`.

#### 60·D — Wire

- Brief screen loads an existing campaign by id, or creates a draft on first save.
- Autosave on blur, debounced; a saved indicator in the header.
- `/campaigns` lists real campaigns with status; empty state links to `/campaigns/new`.
- "Build the plan" persists and advances the stage rail to Plan (which is still a placeholder until 61).
- Real loading skeleton, real error toast.

**Done when:** you can create a campaign, reload the page, and find it exactly as you left it.

---

### Slices 61–64 — the remaining screens

Same A→B→C→D shape. Recorded here at the level the next session needs; each gets expanded into its own plan file when its turn comes, once the preceding screen's confirm gate has taught us what changes.

**Slice 61 — Plan screen.**
*A:* calendar strip, phase blocks, slot cards, credit rail, cadence check — from a fixture holding the full 18-slot Cold Brew Season campaign in the mockup. Slot editing (retype, redate, reformat, delete, add) works locally.
*C:* `campaign_phases` + `campaign_slots` (migration `0021`), the plan-generation YAML template under `packages/shared/src/prompt-templates/templates/plan/`, Zod-validated JSON output through the Anthropic text provider, `POST /api/campaigns/:id/plan`, and campaign-level credit estimation aggregating per-slot `GenerationApi.estimate` calls.

**Slice 62 — Look screen.**
*A:* hero candidate grid, selection, style-contract panel, consistency levels.
*C:* hero generation through the existing `GenerationApi.create` (4 variants, one output target), `style_contract` freeze on `campaigns`, `modifier.campaign_consistency.yaml`, and the anchor-as-inspiration-reference wiring that makes `routing.ts` promote to an i2i model.

**Slice 63 — Board screen.**
*A:* phase-grouped asset cards with every state — planned, queued, generating, ready, approved, failed — plus the style-anchor rail and drift readout.
*C:* `POST /api/campaigns/:id/generate` with `{scope: all | phase | slot[]}`, batched dispatch through `packages/api/src/concurrency.ts`, status polling, slot↔generation linkage (`campaign_id`/`campaign_slot_id` on `generations`), approval, and the palette-distance drift check. Restore campaign awareness in `generation-view.tsx`.
*Note:* first wire routes through the existing `quick.*` templates. Slice 65 upgrades it.

**Slice 64 — Deliver screen.**
*A:* schedule table, package tree, export summary.
*C:* `campaign_exports`, ZIP builder, `calendar.csv`, `calendar.ics`, `copy.md`, `campaign.json`, signed download URL.

**Slice 65 — Campaign prompt routes.** Backend only. `templates/campaign/*.yaml`, `routeCampaignPrompt(recipe, angle, kind)` beside `routeQuickCreatePrompt`, per-route required-variable validation, recipe-specific layouts for catalogue, comparison, and the ad matrix. Closes slice 57.

**Slice 66 — Video I.** Not one screen: video slot cards and an inline player on Plan and Board, a video option in Quick Create, `VideoProvider` + mock + first real provider, alpha-overlay renderer mode, `packages/renderer/src/video.ts`, ffmpeg in the worker image, and the `media_kind` / `duration_bucket` pricebook columns. Repairs the §1.5 defect.

**Slice 67 — Video II.** Storyboard editor, beat generation, concat, captions, music bed, optional voiceover.

**Slice 68 — Publishing.** Deferred.

---

### 6.3 Picking this up cold

Everything a fresh session needs, in one place.

**Where things live**

| What | Where |
|---|---|
| App routes | `apps/web/app/(app)/` |
| API routes | `apps/web/app/api/` |
| App shell, sidebar | `apps/web/components/app/` |
| Campaign UI *(new)* | `apps/web/components/campaign/` |
| Quick Create UI | `apps/web/components/generate/commercial/` |
| DB schema | `packages/db/src/schema/` |
| DB queries | `packages/db/src/queries/` |
| Migrations | `packages/db/src/migrations/` — next free number is `0020` |
| Business logic | `packages/api/src/` |
| Contracts, prompt templates | `packages/shared/src/` |

**Commands**

```bash
pnpm dev                 # web only
pnpm dev:offline-ai      # web + worker, mock AI, local MinIO + ElasticMQ
pnpm db:migrate          # apply migrations
pnpm test                # unit
pnpm test:int            # integration
pnpm typecheck           # tsc -b across the workspace
```

`pnpm --filter @layertone/web lint` fails on a pre-existing ESLint circular-reference config bug. That is not your change — do not chase it.

**Non-negotiable conventions**

- **RLS on every new tenant table.** Copy the policy block from `0008_product_workspace.sql`. A table without policies leaks across workspaces.
- **`withWorkspace()` around every user-scoped query.** It sets `app.current_workspace_id`, which the policies read.
- **`createDb(url, "app_user")` in request paths**, `"app_admin"` only where a policy must be bypassed deliberately (the worker, admin console).
- **Zod contracts in `packages/shared`**, not in the route handler.
- **Do not fork the generation pipeline.** Campaign slot generation goes through `GenerationApi.create` with campaign ids attached, so preflight, pricebook, ledger reserve/commit/release, moderation, and fan-in all keep working.
- **The renderer owns text.** Headlines, prices, badges, CTAs, logos are composited — never prompted into the image. This is the product's moat; see `PromptOverlaySlots` and the `overlay_contract` block in the YAML templates.

**Visual reference** — the mockup at `https://claude.ai/code/artifact/1e245512-1918-4c3f-895b-e7105f4f7e50` is built on the real tokens from `app/theme.css` and `cal-layertone.css`. Use it for layout and treatment; take exact values from the source files.

**The one-line brief for the next session:**

> Read `plans/campaign-builder-v2-research-and-design.md`. Slice 59 is a deletion plus a route shell. Then slice 60·A: build the Brief screen UI against a fixture, no backend, and stop for review.

## 7. Risks and open questions

**Risks**

1. **Style drift under i2i.** Providers honour reference images unevenly. Mitigation: the `locked` level pins seed and adds a post-generation palette-distance check that surfaces drift on the card rather than shipping it silently. Needs empirical calibration per model before 61 ships.
2. **Campaign cost shock.** A 20-slot campaign with video is a large credit event. Mitigation: full estimate on the Plan screen before commitment, per-phase partial commit, and a hard confirmation above a threshold.
3. **Plan quality is the whole product.** If the generated plan is generic, the differentiator collapses. Mitigation: the plan template encodes the researched frameworks explicitly (phase archetypes, Hero–Hub–Hygiene, platform duration rules, the four-beat video structure) rather than asking the model to improvise a strategy. Treat the plan template as a versioned, reviewed asset.
4. **ffmpeg in the worker.** Adds container weight, CPU cost, and a new failure surface. Mitigation: isolate in `packages/renderer/src/video.ts` behind the same sandbox discipline as the Puppeteer fallback; encode as a distinct job step with its own retry.
5. **Video provider volatility.** The field consolidated once already in 2026 (Sora closed in March). Mitigation: `VideoProvider` mirrors `ImageProvider` exactly, so provider swap is a registry change.
6. **Longer time-to-first-pixel.** Campaign Builder is slower than Quick Create by design. Mitigation: this is the point — but the Plan screen must feel like progress, so plan generation streams and the Board fills in progressively.

**Open questions**

- Do campaigns need multi-user review/approval states (P3/P4 personas, "compliance matters"), or is single-owner approval enough for v1?
- Should always-on campaigns auto-roll month to month, or be re-planned each period?
- Should the ad-test-pack recipe carry a scoring/prediction signal (the AdCreative wedge), and is that a v1 concern or a later analytics slice?
- Does music licensing need a curated, cleared library, or do we ship silent-with-captions first? *(Given 85% sound-off, silent-with-captions is defensible for Phase A.)*
- Is a `campaign_slots.locale` dimension worth designing now, given the platform tools are shipping one-click dubbing into 50+ languages?

---

## Sources

- [Hero Hub Hygiene Content Strategy Explained — Equinet Academy](https://www.equinetacademy.com/blog/hero-hub-hygiene-content-strategy-explained-a-complete-guide-with-examples/)
- [Social Media Strategy for Product Launch: 5-Phase Framework — Sociallyin](https://sociallyin.com/resources/social-media-strategy-for-product-launch/)
- [Small Business Social Media Marketing in 2026 — Enrich Labs](https://www.enrichlabs.ai/blog/small-business-social-media-marketing-2026)
- [Social Media Marketing Strategy: A 2026 SMB Guide — Danny Avila](https://dannyavila.com/social-media-marketing-strategy/)
- [Predis.ai vs AdCreative.ai vs GetHookd — GetHookd](https://www.gethookd.ai/learn/predis-ai-vs-adcreative-ai-vs-gethookd-pricing-features-reviews/)
- [AdCreative.ai vs Predis.ai: Best AI Ad Tool 2026 — Max Productive](https://max-productive.ai/blog/adcreative-ai-vs-predis-ai/)
- [7 Best AI Campaign Generation Tools for 2026 — Revv Growth](https://www.revvgrowth.com/ai-marketing/ai-campaign-generator-tools)
- [AI-driven ad automation: TikTok Smart+ vs Meta Advantage+ vs Google — Singular](https://www.singular.net/blog/ad-automation/)
- [TikTok Smart+ vs Meta Advantage+: Which Wins? — Rewarx](https://www.rewarx.com/blogs/tiktok-smart-plus-vs-meta-advantage-plus)
- [Veo 3.1 vs Kling 3.0 vs Sora 2: AI Video API Pricing 2026 — ModelsLab](https://modelslab.com/blog/api/veo-3-1-vs-kling-3-sora-2-ai-video-api-cost-2026)
- [AI Video Generation API Pricing (July 2026) — BuildMVPFast](https://www.buildmvpfast.com/api-costs/ai-video)
- [Runway Gen-4 vs Veo 3.1 vs Kling: 2026 Hands-On Comparison — Tensoria](https://tensoria.fr/en/tools/runway-pro-ai-video-generation)
- [AI Video Generator for Product Ads in 2026: What Each Model Wins — ChatCut](https://chatcut.io/blog/ai-video-generator-for-product-ads)
- [The AI Video Workflow in 2026: A Hands-On Guide — Vivideo](https://vivideo.ai/blog/state-of-ai-video-creation-2026)
- [Best Performing Ad Formats for Ecommerce in 2026 — MHI Growth Engine](https://mhigrowthengine.com/blog/best-ad-formats-ecommerce-2026/)
- [The Best Types of Video Ads for Meta and TikTok in 2026 — Shopify Ecommerce Apps](https://shopifyecommerceapps.com/best-video-ads-meta-tiktok-2026)
- [Short-Form Video Stats 2026 — Firework](https://firework.com/blog/2026-short-form-video-stats)
- [Ultimate Guide to AI UGC Video Ads and Faceless Content — Adweek.org](https://www.adweek.org/blog/ultimate-guide-to-ai-ugc-video-ads-and-faceless-content-examples)
