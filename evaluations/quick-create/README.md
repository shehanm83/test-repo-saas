# Quick Create evaluation baseline

`v1/cases.json` is the frozen evaluation set for the pre-rebuild Quick Create pipeline. It covers idea-only images, saved and uploaded products, multiple references, exact overlays, brand-only generation, evergreen and seasonal moods, a strict-brand/mood conflict, profile safe zones, and vertical static creative.

Run the deterministic offline contract/prompt baseline:

```bash
pnpm eval:quick-create
```

Compare the same cases with a running local or staging app without spending credits:

```bash
pnpm eval:quick-create -- --base-url=http://localhost:3000
```

Submitting real generations is deliberately gated because it spends workspace credits:

```bash
QUICK_CREATE_EVAL_ALLOW_GENERATION=true \
QUICK_CREATE_EVAL_COOKIE='optional-auth-cookie' \
QUICK_CREATE_EVAL_BINDINGS_FILE='evaluations/quick-create/v1/bindings.local.json' \
pnpm eval:quick-create -- --base-url=https://staging.example.com --generate
```

Copy `v1/bindings.example.json` to an ignored local file and map fixture UUIDs to real assets in the evaluation workspace. Uploaded-product bindings must point to fresh staged uploads. The runner refuses credit-bearing generation without a bindings file, so fixture placeholder IDs cannot accidentally be submitted.

The command prints a JSON report to stdout. Real-generation results include generation IDs, variant status, model codes, and signed output URLs for human or automated vision review. Use `scorecard.example.json` for blind human scoring. Keep scored reports outside source control if they contain signed URLs or customer data.

Quality dimensions use a 1–5 scale:

- intent relevance;
- product identity;
- brand fit;
- mood adherence;
- composition;
- subject completeness/cropping;
- text safety;
- technical quality.

Job completion is not a quality pass. A baseline is accepted only after the visual scorecards are reviewed.

After blind review, compare V1 and V2 by flow, provider, and aspect ratio:

```bash
pnpm eval:quick-create:analyze -- evaluations/quick-create/reports/*.scorecard.json
```

The aggregator reports accepted/downloaded rates, rejection reasons, refinements per accepted
result, latency, credits per accepted result, and per-dimension quality. Keep real reports out of
source control when they contain customer assets or signed URLs.
