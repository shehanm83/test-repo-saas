# Quick Create Prompt Templates

Quick Create uses four base templates plus reusable modifiers.

## Base Routes

| Route | When Used |
| --- | --- |
| `quick.image_only` | No selected product and no campaign fields. |
| `quick.product_only` | Product reference exists and no campaign fields. |
| `quick.campaign_only` | Campaign fields exist and no product reference. |
| `quick.product_campaign` | Product reference and campaign fields both exist. |

## Modifiers

| Modifier | When Applied |
| --- | --- |
| `modifier.brand_basic` | Brand is selected and brand colors or fonts are enabled. |
| `modifier.brand_logo_overlay` | Brand is selected, logo usage is enabled, and selected logo asset IDs exist. |
| `modifier.mood_selected` | Mood is selected. |
| `modifier.format_social_post` | Social output that is not vertical/profile/cover. |
| `modifier.format_vertical` | `9:16` formats such as stories, reels, and TikTok. |
| `modifier.format_profile_cover` | Facebook profile and cover formats. |
| `modifier.format_general_image` | Non-social image outputs. |

## Renderer Overlay Contract

Quick Create prompts do not ask the image model to recreate exact logos or exact readable text. The prompt builder returns `overlaySlots` for deterministic renderer placement.

Supported overlay slots currently include:

- `logoAssetIds`
- `headline`
- `subtitle`
- `price`
- `discount`
- `badgeText`
- `cta`
- `legalText`
- `website`
- `phone`
- `qrUrl`

The worker persists rendered prompt metadata and overlay slots under `settings.commercial.prompt` on the generation row for inspection/debugging.

## Minimum Input

The minimum production Quick Create path is:

- Output format
- Brief
- Quality tier
- Number of variants

Brand, mood, product, and campaign details are optional and should only add modifiers or overlay slots when present.
