# Slice 56 — Quick Create Executable Prompt Template System

**Phase:** 19 — Commercial generation upgrade
**Depends on:** 53, 54, 55

## Decision

Quick Create prompt templates are executable YAML files. Documentation and examples are Markdown.

This slice is Quick Create only. Campaign Builder templates are split into [Slice 57](slice-57-campaign-builder-prompt-templates.md) because that path still needs additional UX and contract work.

## Implemented Scope

- [x] Add a shared prompt-template schema, loader, renderer, and Quick Create router.
- [x] Add four Quick Create base templates:
  - `quick.image_only`
  - `quick.product_only`
  - `quick.campaign_only`
  - `quick.product_campaign`
- [x] Add reusable modifiers:
  - `modifier.brand_basic`
  - `modifier.brand_logo_overlay`
  - `modifier.mood_selected`
  - `modifier.format_social_post`
  - `modifier.format_vertical`
  - `modifier.format_profile_cover`
  - `modifier.format_general_image`
- [x] Route Quick Create paths from actual selected product and campaign data.
- [x] Keep exact logos and exact readable campaign copy renderer-owned through overlay slots.
- [x] Persist rendered prompt metadata and overlay slots in `settings.commercial.prompt`.
- [x] Wire the worker so Quick Create uses YAML templates instead of ad hoc prompt string concatenation.
- [x] Add focused tests for Quick Create prompt routing/rendering.
- [x] Add authoring documentation.

## Template Contract

Every YAML template defines:

- Stable `id`, `name`, `category`, `version`, and `tags`.
- `compatible_models`.
- Required and optional variables.
- Safety rules.
- Overlay contract.
- Prompt body.
- Optional negative prompt body.

## Quick Create Routes

| Route | Meaning |
| --- | --- |
| `quick.image_only` | Brief plus output settings, no product, no campaign details. |
| `quick.product_only` | Product reference exists, no campaign details. |
| `quick.campaign_only` | Campaign details exist, no product reference. |
| `quick.product_campaign` | Product reference and campaign details both exist. |

## Overlay Direction

The image model owns:

- Background scene
- Lighting
- Composition
- Product context
- Visual mood
- Non-readable decorative elements

The renderer owns:

- Selected brand logos
- Headlines
- Subtitles
- Prices and discounts
- Badges
- CTAs
- Legal text
- Websites
- Phone numbers
- QR codes

## Verification

- `pnpm --filter @vyora/shared test -- src/prompt-templates/router.test.ts src/generation/preflight.test.ts`
- `pnpm --filter @vyora/shared typecheck`
- `pnpm --filter @vyora/shared build`
- `pnpm --filter @vyora/worker typecheck`

Suggested commit:

```bash
git commit -m "feat(generation): add quick create prompt templates"
```
