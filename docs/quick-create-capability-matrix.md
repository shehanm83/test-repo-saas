# Quick Create capability matrix

This matrix describes the compatibility enforced in code. Runtime routing uses each registered
provider's `ProviderCapabilities`; `Gateway.capabilityMatrix()` exposes the effective matrix for
diagnostics. A provider may not silently drop an essential reference.

| Model/provider | Tier | Image reference | Multiple refs | Product identity | Max refs | Supported reference roles |
| --- | --- | --- | --- | --- | ---: | --- |
| `gpt-image-2` / OpenAI | premium | yes | yes | yes | 16 | product, style, composition, brand, inspiration |
| `gpt-image-1` compatibility alias | premium | yes | yes | yes | 16 | product, style, composition, brand, inspiration |
| `flux-1.1-pro` / Flux | fast | yes | no | no | 1 | style, composition, brand, inspiration |
| `recraft-v3` / Recraft | design | yes | no | no | 1 | style, inspiration |
| `bedrock-sd35` / Bedrock | fallback | no | no | no | 0 | none |
| `nova-canvas` / Bedrock | fallback | no | no | no | 0 | none |

Product uploads are snapshotted as essential `product_identity` references. Therefore a
product-grounded request routes only to a model that supports identity preservation; style-only
references may use a vision-description fallback where permitted.

## Prompt and renderer compatibility

| Layer | Compatibility source | Enforcement point |
| --- | --- | --- |
| Prompt template → model | YAML `compatible_models` | worker rejects `model_prompt_incompatible` before generation |
| Mood → aspect ratio | `moods.supported_aspect_ratios` | preflight and generation plan |
| Mood → template | mood/template bindings and recipe families/layouts | planner and template selection |
| Template → aspect ratio | `templates.supported_aspect_ratios` | template query |
| Template → exact copy | template `slots` | generation plan requires every requested overlay slot |
| Template → renderer | `renderer_compatibility` and `requires_browser_render` | renderer dispatch |
| Output → provider source | provider-specific closest source ratio | exact final renderer canvas with protected center framing |

The authoritative capability declarations live in `packages/gateway/src/providers`; prompt
compatibility lives in `packages/shared/src/prompt-templates/templates`; renderer/template
compatibility is persisted on `templates`. Update this document and the associated routing tests
when those declarations change.
