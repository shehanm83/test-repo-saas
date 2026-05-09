# Slice 57 — Campaign Builder Prompt Templates

**Phase:** 19 — Commercial generation upgrade
**Depends on:** 56

## Scope

This future slice covers Campaign Builder prompt routing after the Campaign Builder UX and data contract are finalized.

Campaign Builder should not reuse Quick Create routing blindly. It needs deeper paths for campaign sets, product bundles, catalogue layouts, comparisons, multi-format ad packages, and campaign consistency rules.

## Planned Work

- [ ] Identify Campaign Builder base routes from finalized UX.
- [ ] Define Campaign Builder YAML templates.
- [ ] Add Campaign Builder-specific modifiers for package consistency and catalogue/comparison layouts.
- [ ] Add validation for required campaign/product variables by route.
- [ ] Wire worker route selection for `mode: "campaign_builder"`.
- [ ] Persist Campaign Builder prompt metadata and overlay slots.
- [ ] Add focused tests for each Campaign Builder route.
