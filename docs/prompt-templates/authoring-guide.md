# Prompt Template Authoring Guide

Executable prompt templates live in `packages/shared/src/prompt-templates/templates`.

Use YAML for executable templates. Use Markdown only for documentation and examples.

## Required Metadata

Every template must define:

- `id`: stable router ID, for example `quick.image_only`.
- `name`: human-readable name.
- `category`: `image_generation` or `modifier`.
- `version`: positive integer.
- `compatible_models`: model codes this template is intended for.
- `tags`: searchable categories.
- `variables.required`: placeholder paths that must resolve before rendering.
- `variables.optional`: placeholder paths that may be empty.
- `safety_rules`: model-facing safety constraints.
- `overlay_contract`: what the image model owns and what the renderer owns.
- `prompt`: executable prompt body.
- `negative_prompt`: optional negative prompt body.

## Placeholder Rules

Placeholders use `{{ path.to.value }}` syntax and are resolved from the prompt context.

Prefer summary variables such as `product_summary`, `campaign_summary`, `brand_summary`, `mood_summary`, and `composition_summary` when a whole group should be readable by the model.

Use explicit variables such as `output.width`, `output.height`, and `output.aspect_ratio` when validation or exact format behavior depends on them.

## Overlay Rules

Exact logos and exact readable copy are renderer-owned by default. Prompt templates should ask the image model to reserve clean space, not to draw:

- Logos
- Headlines
- Prices
- Discounts
- CTAs
- Legal text
- URLs
- Phone numbers
- QR codes

The image model owns background, lighting, composition, atmosphere, product context, and non-readable decorative elements.

## Safety Rules

Do not ask the image model to invent:

- Product claims
- Medical, financial, or legal promises
- Certifications
- Awards
- Prices or discounts
- Contact details
- Brand marks

If exact content is needed, expose it as an overlay slot.
