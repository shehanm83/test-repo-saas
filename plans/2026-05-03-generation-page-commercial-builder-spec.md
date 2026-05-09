# Generation Page Commercial Builder Spec

**Date:** 2026-05-03
**Status:** Draft plan
**Owner:** Shehan Fernando
**Applies to:** `/generate`, product workspace, generation API, worker prompt/render pipeline

## Problem

The current generation page is useful for a first image, but it is too primitive for commercial media production. A serious customer does not only have "an image and a prompt"; they have products, SKUs, prices, promotions, claims, legal text, brand rules, campaign formats, output sizes, and consistency requirements across a package of assets.

The redesigned generation experience must support both:

- **Quick Create:** fast path for simple users.
- **Campaign Builder:** structured commercial workflow for reusable products, campaigns, layouts, output packs, and preflight checks.

## Product Principles

1. **Keep the simple path.** Do not force every user through a long wizard for a single image.
2. **Promote products to first-class data.** Product details and images should be saved once and reused across many generations.
3. **Use structured commercial fields before free prompts.** Price, discount, CTA, legal text, benefits, and output formats should be explicit fields, not hidden in a prompt.
4. **Render exact text outside the model when possible.** Prices, claims, disclaimers, logos, QR codes, and CTA text must be template-rendered for fidelity.
5. **Generate packages, not just images.** A campaign can produce multiple variants and platform resize packs from one consistent creative direction.
6. **Check commercial readiness before spending credits.** Warn on missing price, missing CTA, low-quality product images, text overflow, missing logo, and size/template mismatch.

## Target Information Architecture

### Navigation

- `/generate`: entry point with `Quick Create` and `Campaign Builder` modes.
- `/products`: reusable product workspace for product lines, products, variants, and assets.
- `/projects`: campaign grouping remains useful and should link generated packages to a campaign/project.
- `/brands`: brand kit remains the source for logo, colors, fonts, voice, and restrictions.

### `/generate` Page Layout

- **Top mode switch:** `Quick Create` and `Campaign Builder`.
- **Left rail:** step navigation and completion status.
- **Main panel:** active step fields.
- **Right rail:** live preview summary, warnings, selected formats, credit estimate, and generate button.
- **Mobile:** steps collapse into an accordion; right rail becomes a sticky bottom review drawer.

## Quick Create Flow

Use this for users who want speed.

1. **Product:** upload one product image or pick one saved product.
2. **Brief:** short description plus optional title/CTA fields.
3. **Brand:** choose brand kit and mood.
4. **Output:** choose one target and 1-4 variants.
5. **Generate.**

Quick Create should write the same backend contract as Campaign Builder, but with defaults.

## Campaign Builder Flow

### Step 1: Choose Creation Type

| Type | Purpose | Product count | Output shape |
|---|---|---:|---|
| Single product image | One product hero or lifestyle image | 1 | 1-4 variants |
| Product bundle image | Bundle/combo/kit offer | 2-8 | 1-4 variants |
| Campaign set | Same product/product line across multiple ad formats | 1-many | Package |
| Leaflet/catalogue | Commercial flyer with many products and prices | 4-40 | Printable/social flyer |
| Before/after comparison | Beauty, cleaning, fitness, tech comparisons | 1-2 | Comparison layout |
| Social ad pack | Platform-specific ad creatives | 1-many | Resize pack |

### Step 2: Add Products

Users can either select a saved product/product line or create products inline.

Required fields:

- Product name
- Primary image
- Category

Recommended commercial fields:

- Brand
- Model/SKU
- Subtitle
- Price
- Compare-at price
- Discount
- Currency
- Key features
- Benefits
- Target audience
- Color variant
- Packaging image
- Lifestyle/reference images

### Step 3: Campaign Details

Campaign-level fields:

- Campaign title
- Campaign message
- Offer type: launch, sale, seasonal, bundle, clearance, event, evergreen
- Discount/badge text
- CTA
- Offer expiry
- Website
- Phone
- QR code target URL
- Legal small text
- Mandatory disclaimer
- Target audience
- Tone of voice override

### Step 4: Template and Layout

Template families:

- Product launch
- Sale poster
- Seasonal campaign
- New arrival
- Bundle offer
- Premium lifestyle
- Minimal product hero
- Marketplace image
- Social ad
- Story/reel cover
- Event promotion
- Leaflet/catalogue
- Comparison/before-after

Layout choices:

- Centered product hero
- Split layout
- Grid layout
- Magazine layout
- Catalogue layout
- Carousel layout
- Story layout
- Comparison layout

### Step 5: Brand and Mood

Use existing brand kit fields and extend brand rules:

- Logo
- Colors
- Fonts
- Voice notes
- Preferred layout style
- Preferred image style
- Restricted mode
- Banned words
- Mandatory disclaimers
- Claim/legal rules

Mood should remain separate from brand. Mood controls visual atmosphere; brand controls identity.

### Step 6: Product Prominence and Composition

Controls should be explicit, not just one slider:

- Product size: small, balanced, dominant
- Product position: center, left, right, bottom, grid slot, template-driven
- Background style: studio, lifestyle, abstract, seasonal, marketplace white, transparent
- Realism: clean render, realistic photo, premium editorial, commercial 3D
- Shadow/reflection: none, soft shadow, hard shadow, reflection
- Label visibility: hide, preserve, emphasize
- Packaging visibility: product only, packaging only, both
- Original shape lock: on/off
- Blend with brand: low, medium, high

### Step 7: Output Settings

Users choose:

- Variant count: 1-4
- Quality tier: standard/premium
- Consistency mode: off, same campaign mood, strict campaign system
- Output formats: Instagram square, Instagram portrait, story/reel, Facebook, LinkedIn, website banner, product card, ad creative, printable leaflet
- Export package: PNG, WebP, ZIP

### Step 8: Review Cost and Generate

Before generation:

- Show selected products and missing-field warnings.
- Show text overflow warnings for chosen templates.
- Show image quality warnings.
- Show platform/template compatibility warnings.
- Show credits by base generation, extra products, variants, output formats, premium model, and QR/copy extras.
- Require confirmation only for high-cost packages.

## Product Workspace Domain

### Product Line

A product line is a reusable collection of related products.

Fields:

- Name
- Brand ID
- Category
- Description
- Target audience
- Default currency
- Default campaign notes
- Product IDs

### Product

Fields:

- Product line ID
- Name
- Brand label
- Model/SKU
- Category
- Title
- Subtitle
- Description
- Price
- Compare-at price
- Discount
- Currency
- Key features
- Benefits
- Target audience
- Variant attributes: color, size, material, flavor, package quantity
- Status: draft, active, archived

### Product Variant

Use variants when one product has sellable variations that should be selectable in ads.

Fields:

- Product ID
- Variant name
- SKU
- Color
- Size
- Material/flavor/package quantity
- Price override
- Compare-at price override
- Asset overrides
- Status: draft, active, archived

### Product Assets

Asset kinds:

- Product image
- Packaging image
- Lifestyle image
- Label/detail image
- Before image
- After image
- Transparent cutout

Asset metadata:

- Width, height, bytes, MIME type
- Background removed: true/false
- Quality score
- Has transparent background
- Detected text/label visibility

## Generation Contract Extensions

The frontend should submit a structured commercial request. The backend can store this in `generations.settings` initially, but durable product data should live in dedicated product tables.

Suggested request shape:

```ts
type CommercialGenerationInput = {
  mode: "quick" | "campaign_builder";
  creationType:
    | "single_product"
    | "product_bundle"
    | "campaign_set"
    | "leaflet_catalogue"
    | "comparison"
    | "social_ad_pack";
  brandId: string;
  projectId?: string | null;
  moodId?: string | null;
  productRefs: Array<{
    productId?: string;
    uploadId?: string;
    role: "hero" | "bundle_item" | "catalogue_item" | "before" | "after";
    commercialFields?: ProductSnapshot;
  }>;
  campaign: {
    title?: string;
    subtitle?: string;
    message?: string;
    price?: string;
    discount?: string;
    badgeText?: string;
    cta?: string;
    offerExpiry?: string;
    legalText?: string;
    website?: string;
    phone?: string;
    qrUrl?: string;
    benefits?: string[];
    targetAudience?: string;
  };
  template: {
    family: string;
    layout: string;
    templateId?: string;
  };
  composition: {
    productSize: "small" | "balanced" | "dominant";
    productPosition: "center" | "left" | "right" | "bottom" | "template";
    backgroundStyle: "studio" | "lifestyle" | "abstract" | "seasonal" | "marketplace_white" | "transparent";
    realism: "clean_render" | "realistic_photo" | "premium_editorial" | "commercial_3d";
    shadowReflection: "none" | "soft_shadow" | "hard_shadow" | "reflection";
    labelVisibility: "hide" | "preserve" | "emphasize";
    packagingVisibility: "product_only" | "packaging_only" | "both";
    keepOriginalShape: boolean;
    brandBlend: "low" | "medium" | "high";
  };
  outputs: {
    variants: 1 | 2 | 3 | 4;
    quality: "standard" | "premium";
    consistency: "off" | "same_mood" | "strict_campaign";
    formats: string[];
  };
};
```

## Commercial Quality Checks

Preflight warnings should be non-blocking unless the request cannot be generated.

Warnings:

- Product image is too small for selected output size.
- Product image has busy background and no cutout.
- Missing price for sale/catalogue templates.
- Missing CTA for social ad templates.
- Headline/subtitle/legal text may overflow safe zone.
- Missing logo while brand logo toggle is enabled.
- Brand has no palette or fonts.
- QR URL is invalid.
- Offer expiry is in the past.
- Catalogue has too many products for selected layout.
- Selected mood does not support selected aspect ratio.
- Requested output pack exceeds available credits.

Blocking errors:

- No brand selected if template requires brand.
- No product selected for product modes.
- No output format selected.
- No compatible template exists.
- Insufficient credits.
- Safety/AUP failure.

## Consistency Strategy

Campaign consistency should be handled by a campaign-level creative seed and shared prompt/style summary.

For a campaign package:

- Build one `campaignStyleBrief` from brand, mood, template family, and composition settings.
- Use the same style brief across all variants/formats.
- Keep text and product snapshots deterministic per output.
- Render exact commercial text with templates.
- Store the campaign/package ID on every generation row or create a `generation_packages` table.

## Implementation Strategy

Deliver in four slices:

- **Slice 52:** Product workspace schema/API/uploads.
- **Slice 53:** Commercial generation contract, validation, estimates, preflight checks.
- **Slice 54:** `/generate` redesign with Quick Create and Campaign Builder.
- **Slice 55:** Output packages, resize packs, campaign consistency, and results page grouping.

This sequence avoids a risky UI-only rewrite. The frontend should not invent commercial state that the backend cannot validate or price.
