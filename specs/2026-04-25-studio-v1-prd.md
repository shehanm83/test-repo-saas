# PRD — Studio (image generation SaaS, v1)

**Status:** Draft for review
**Date:** 2026-04-25
**Owner:** Shehan Fernando
**Quality bar:** **Production v1 — every shipped feature is built as production-grade code.** No half-implementations, no temporary shortcuts, no placeholders disguised as features. The product scope (in § 6) is deliberately bounded — but every item that is in scope is built to ship to paying customers on day one. Testing scope is intentionally trimmed (manual visual review of templates; no automated visual regression / load tests / migration safety automation — see spec § 9). The trim is on test breadth only; feature code itself is full-fidelity.
**Related docs:**
- `2026-04-25-layertone-v1-spec.md` — functional/technical spec
- `2026-04-25-layertone-v1-architecture.md` — architecture & deployment
- `2026-04-25-layertone-v1-ui-prompts.md` — prompts for AI design tools

---

## 1. Problem

Small and mid-sized businesses, in-house marketers, agencies-of-one, and individual creators need on-brand marketing images quickly. Existing tools split into two camps: **creator tools** (Canva, Adobe Express) demand manual composition skill and time, and **pure generators** (Midjourney, Ideogram) cannot enforce brand fidelity — logos, fonts, and colors come out approximate at best.

The gap is a tool that produces **finished, brand-correct images from a short brief** — no canvas, no manual layout, no design skill required.

## 2. Audience

The product targets four personas in v1, each landing on a different tier of a single product:

| # | Persona | Mental model | Tier shape |
|---|---|---|---|
| P1 | Solo creator / influencer | "5 social posts before tonight" | Free / Starter |
| P2 | SMB / e-commerce founder | "Consistent product visuals for my Shopify store" | Pro |
| P3 | In-house marketer at small/mid company | "Campaigns. Compliance matters." | Business |
| P4 | Agency-of-one / freelance designer | "5–20 client brands kept clean and separate" | Business / Agency |

## 3. Value proposition

> Describe what you want in a sentence, pick your brand, click generate. The system produces 3–4 finished, on-brand images. Brand fonts, colors, and logo are exact by construction — not approximated by an AI model.

## 4. Differentiation vs. alternatives

| Alternative | What's different about us |
|---|---|
| **Canva / Adobe Express** | We're generation-driven, not composition-driven. No canvas, no layer panel, no design skill required. |
| **Midjourney / Ideogram / Recraft** | We enforce brand fidelity by construction — logo SVG placed by template, brand fonts rendered by template engine, brand colors as CSS tokens. The model never "interprets" the logo. |
| **Predis.ai / AdCreative.ai** | Closest in shape. We differentiate via the **Mood system** (admin-curated seasonal + evergreen style packs) blended with brand under user control. |

## 5. Core value loop

1. Sign up via Google / Microsoft / Apple / email (Clerk).
2. Set up a brand: upload logo, paste palette (or extract from logo / website URL), pick brand fonts.
3. Click **New generation**:
   - Pick the **output target**: a specific social platform/format (Instagram Story, LinkedIn Post, etc. — sets exact pixel dimensions) OR "Just an image" (free aspect ratio choice).
   - Write a 1–3 sentence brief.
   - Pick brand.
   - Optionally upload an **inspiration image** for visual cues (per-generation only; does not change the brand).
   - Optionally pick a **Mood**.
   - Set toggles (brand on/off per element, mood on/off per element).
4. ~10–20s later: 3–4 finished variants appear.
5. Pick one, optionally tweak headline text or regenerate background, download.

That is the entire core loop. No canvas, no font picker, no layer manipulation.

> **Note on social platform picker.** Picking "Instagram Story" only sets the output dimensions to 1080×1920 — Studio does **not** publish to social platforms in v1. The user downloads the image and posts it themselves. Direct social publishing is a separate spec cycle.

## 6. Feature scope — v1

### In-scope

- **Authentication** via Clerk: Google, Microsoft, Apple, email/passwordless.
- **Workspaces** (personal + organization), seats, role-based access.
- **Brands**: logo, palette, fonts, voice notes, optional URL extraction.
- **Projects**: lightweight grouper inside a brand (campaign / launch tagging).
- **Mood library**: admin-authored seasonal + evergreen moods. Two kinds:
  - **Seasonal** (Christmas, Diwali, Halloween, Pride, etc.) with validity windows.
  - **Evergreen** (Minimalist Tech, Luxury Lifestyle, Fitness Energetic, etc.) year-round.
- **Generation pipeline**: brief → AI background → server-side template renderer → 3–4 finished variants.
- **Output target picker**: choose between social platform/format presets (Instagram, Facebook, LinkedIn, TikTok, Pinterest, YouTube, X — each with platform-correct pixel dimensions) or a free-aspect-ratio "Just an image" mode (1:1 / 4:5 / 9:16 / 16:9). The picker is dimension/sizing only — it does **not** publish to any platform.
- **Inspiration image (per-generation reference)**: optional one-time upload of a reference image that influences the AI background for the current generation only. Distinct from persistent brand reference assets. Influence weight selectable: Subtle / Balanced / Strong.
- **Template library**: admin-authored layouts with text-safe zones, slots (logo, headline, subhead, CTA, decorations), preferred-model hints. Templates declare which output-target dimensions they support.
- **Stock asset library**: curated icons + simple stock photos, accessible during generation via mood decoration tags.
- **Optional caption generation**: short rich-text output, 1–5 credits, separate from image generation.
- **Credit ledger**: per-workspace, with reservation/commit/release semantics. Survives partial failures.
- **Stripe billing**: subscriptions + monthly grants + PAYG top-up packs.
- **Admin back-office**: Mood Studio, Template Studio, stock library manager, price book editor, user/workspace/ledger tools.
- **Generation history**: re-download, re-generate from past brief, snapshot of what model and pricing were used.

### Explicitly out-of-scope (deferred to later spec cycles)

- Social publishing of any kind (Instagram, LinkedIn, TikTok, etc.).
- Video / animation generation.
- Per-brand role granularity (workspace roles only in v1).
- SAML / SSO for enterprise (Clerk OIDC enterprise lift later).
- Multi-language UI (English only).
- Mobile native apps (responsive web only).
- Public API / webhooks for customers.
- Analytics ingestion from social platforms.
- User-authored Moods (deferred to v2 as Pro+ upsell).
- Full Canva-style canvas editor (architectural decision — not a deferral).
- Full OpenTelemetry observability pipeline (placeholder hooks only in v1).

## 7. Pricing model

Three tier knobs: **brands included**, **seats included**, **monthly credit grant**. Per-brand add-on for overage on any tier. PAYG credit top-up packs available on every tier.

| Tier | Price | Brands | Seats | Monthly credits | Persona |
|---|---|---|---|---|---|
| Free | $0 | 1 | 1 | 30 | Trial |
| Starter | $19/mo | 1 | 1 | 250 | P1 |
| Pro | $49/mo | 3 | 3 | 1,000 | P2 |
| Business | $129/mo | 10 | 10 | 4,000 | P3 / small P4 |
| Agency | $299/mo | 50 | unlimited | 15,000 | P4 |
| Per-brand add-on | +$5/mo each | — | — | — | Overage |
| PAYG top-up packs | $9 / 200 credits, $29 / 750, $79 / 2,500 | — | — | — | All tiers |

Pricing is **indicative, not committed** — to be tuned during go-to-market based on inference cost benchmarking and competitor pricing.

### Credit cost rules

- **Standard image generation:** 5 credits (Flux 1.1 Pro background)
- **Premium image generation:** 15 credits (gpt-image-1 background, Pro+ tier toggle)
- **Design-y / typographic image generation:** 8 credits (Recraft V3 background)
- **Inspiration-image surcharge:** +2 credits per variant when a per-generation inspiration image is attached (covers image-to-image upstream cost differential). Surcharge waived if the chosen model is already image-to-image native at no upstream price difference.
- **Caption / copywriting generation:** 1–5 credits depending on length tier
- **Re-render with identical brief on same brand + mood + output target:** discounted (50% if cached background)
- **Failed generation:** zero net credit cost (reservation released)

Pricing is versioned via `price_book_entries` — every generation snapshots the price book version it used.

## 8. Success criteria for v1 launch

| # | Criterion |
|---|---|
| S1 | New user goes from landing page → first generated image in **under 5 minutes**. |
| S2 | Brand fidelity is **visually unbroken** — logo, colors, fonts always exact by construction. |
| S3 | Credit reservations **never leak**: failed jobs return credits, successful jobs commit, no double-spend. |
| S4 | **Tenant isolation provably enforced** — no cross-workspace data access at DB or storage layer. Property-tested. |
| S5 | Generation latency **p50 ≤ 20s, p95 ≤ 45s** (model time dominates). |
| S6 | Stripe → ledger reconciliation **balances to the cent** daily. |
| S7 | Local development environment runs with **zero AWS/Clerk/Stripe credentials** required. |

## 9. Quality bar

- **Production-grade feature code from day one.** Every feature listed in § 6 In-scope ships as fully implemented production code — no stubs, no "we'll wire this up later," no feature-flagged placeholders shipped to paying customers. The scope is bounded; the implementation depth is full.
- **Cost-conscious infra** with documented upgrade paths: scale-to-zero where feasible, premium AWS-native primitives held in reserve as named upgrade triggers (see architecture § 9). Choosing the cheaper-at-zero option is **not** a quality compromise — every option is a drop-in replacement for its premium counterpart.
- **Auth, billing, tenancy isolation, credit accounting, and prompt-injection / output-moderation safeguards are non-negotiable.** These ship at full production fidelity.
- **Visual fidelity of templates is the differentiator** — every template is reviewed manually against synthetic brands as part of the release checklist before any new template publishes.
- **Testing breadth is intentionally trimmed** (no automated visual regression, no automated load tests, no automated migration safety tests — see spec § 9). This is a scope choice on **test breadth**, not a quality compromise on **feature code**. Critical correctness invariants (RLS isolation, ledger non-negative-balance, ledger reservation-resolution) are unit + integration tested.

## 10. Open questions

- **Final mood-naming**: working name is **Moods** in this PRD; can be renamed without architectural impact.
- **Indemnification commitment**: which AI providers' commercial-safe terms should we surface to enterprise customers? Decide before public launch.
- **Pricing rebalance**: tiers above are indicative — finalize after pricing study.
- **AUP specifics**: which prohibited-content categories beyond standard (CSAM, weapons) — to be authored before public beta.
