Actually this is pretty good architecture-wise.
You are separating:

* **Campaign/business context**
* **Product context**
* **Visual direction**
* **Renderer constraints**
* **Negative prompts**
* **Overlay slots**

That is the correct direction for a commercial-grade generation system.

But the reason you got a “generated poster/ad” feeling instead of a reusable raw product image is because your prompt mixes **three responsibilities together**:

1. Generate the product itself
2. Generate the advertising composition
3. Generate marketing overlays/layout space

That causes the model to think:

> “I should create a finished ad banner”

instead of:

> “I should create a clean product asset”

---

# Main issue

This line changes the entire behavior:

> "Create a polished product campaign image"

and these:

* exploding through water and ice
* athletes blurred in background
* premium advertising quality
* reserve overlay space
* headline/subtitle/price/CTA slots

Those push it heavily toward **final ad creative**.

---

# You actually need TWO generation modes

## 1. Product Asset Generation (RAW)

Purpose:
Generate reusable clean product images.

This should produce:

* transparent PNGs
* isolated products
* multiple angles
* clean lighting
* no campaign styling
* no overlays
* no environment storytelling

Example:

```text
Create a clean commercial product photo of a black hydration drink bottle.

Centered composition.
Studio lighting.
Neutral gray background.
Realistic plastic texture with condensation.
No text overlays.
No advertising composition.
No environment props.
Suitable for reuse in future campaigns.
```

This becomes:

* your asset library
* reusable catalog
* training set
* template input

---

# 2. Campaign Composition Generation

THEN use those assets to generate campaigns.

Example:

```text
Create a dynamic sports advertisement using the provided hydration drink bottle asset.

Bottle exploding through water and ice.
Dark gym atmosphere.
Reserve overlay space on left side.
No readable text.
High-energy sports commercial style.
```

THIS is where your current prompt belongs.

---

# Right now your system is trying to do both simultaneously

That creates:

* inconsistent product design
* warped labels
* fake branding
* random packaging
* low reusability

Very common AI media generation mistake.

---

# Better architecture

## Step 1 — Product Draft

Generate:

* bottle only
* can only
* box only
* isolated
* transparent background preferred

Store:

* product images
* masks
* metadata
* brand colors
* label areas
* perspective angles

---

## Step 2 — Product Validation

Possible automated checks:

* label readability
* symmetry
* deformation
* cap integrity
* packaging realism

---

## Step 3 — Campaign Rendering

Use:

* product asset
* campaign template
* scene generator
* overlay system

This is where:

* sports scenes
* beauty ads
* gaming ads
* seasonal campaigns
* social media formats

get generated.

---

# Another important issue

You currently have:

```text
Do not render readable campaign text
```

GOOD.

But:

```text
label visibility: preserve
```

conflicts with:

```text
No brand selected
```

and:

```text
Product 1 (hero): drink_o
```

Because the model invents branding.

You need either:

* actual uploaded label artwork
  OR
* explicitly tell it:
  `"generic unbranded sports drink bottle"`

Otherwise it hallucinates labels.

---

# Commercial systems usually separate these layers

Real systems often have:

| Layer                | Purpose           |
| -------------------- | ----------------- |
| Product Asset Engine | clean products    |
| Scene Engine         | environments      |
| Composition Engine   | framing/layout    |
| Overlay Engine       | text/buttons      |
| Brand Engine         | typography/colors |
| Export Engine        | social formats    |

You are already moving toward this unintentionally.

---

# My suggestion

Add generation type:

```json
generationMode:
- product_asset
- campaign_scene
- final_ad
```

This alone will massively improve quality consistency.

---

# For YOUR current test

If you want RAW product images:

Remove:

* campaign details
* CTA
* subtitle
* offer
* audience
* benefits
* overlay slots
* water explosion
* athletes
* reserve text space

Keep ONLY:

```text
Create a realistic hydration drink bottle product photo.

Matte black bottle with blue accents.
Studio lighting.
Centered composition.
Condensation droplets.
Neutral background.
Commercial product photography.
No text overlays.
No advertising layout.
```

That will generate MUCH better reusable product assets.
