# Free → PAYG Upgrade Flow Design

## Goal

Give free-plan users a clear, actionable path to purchase credits or subscribe whenever they encounter a locked feature, without forcing them off the page they're on.

## Background

Free users can already see locked feature states across the app (moods, stock library, premium quality on the generate page), but there is no button or link that lets them act. The billing page at `/billing` already has working Stripe Checkout links for three credit topup packs and a subscription. Buying any topup pack automatically converts the account to PAYG via the existing Stripe webhook.

## Approach

Combination of:
- **Inline CTAs** on the generate page — small "Upgrade →" buttons adjacent to existing locked-state labels
- **Modal CTAs** on dedicated locked pages (moods, stock library) — a dialog that surfaces the full billing options without navigating away

## Components

### `UpgradeModal`

**Path:** `apps/web/components/billing/upgrade-modal.tsx`

Client component. Renders as a centered overlay dialog.

Props:
```ts
{
  feature: "moods" | "stock" | "premium-quality" | "generic";
  open: boolean;
  onClose: () => void;
}
```

Content:
- Feature-specific headline and one-line description:
  - `moods` → "Unlock Moods" / "Moods require credits or a subscription."
  - `stock` → "Unlock Stock Library" / "Stock images require credits or a subscription."
  - `premium-quality` → "Unlock Premium Quality" / "Premium quality requires credits or a subscription."
  - `generic` → "Upgrade your plan" / "This feature requires credits or a subscription."
- Three topup credit pack buttons ($9 / $29 / $79) — clicking calls `POST /api/billing/topup { packCode }` and redirects to the returned Stripe Checkout URL
- One "Subscribe — $49/mo" button — clicking calls `POST /api/billing/subscription` and redirects to the returned URL
- Close button (X) in top-right corner
- Backdrop click closes the modal

State: each trigger site owns a local `useState(false)` for `open`. No global state.

Data: topup pack metadata (code, credits, priceUsd) comes from the `TOPUP_PACKS` constant in `@layertone/billing` — imported directly, no fetch. Checkout is initiated by `POST /api/billing/topup { packCode }` → response `{ url }` → `window.location.href = url`. Subscribe button calls `POST /api/billing/subscription` the same way. Both calls mirror the existing `billing-page.tsx` pattern exactly.

### `UpgradeInline`

**Path:** `apps/web/components/billing/upgrade-inline.tsx`

Client component. A compact locked-state label with an "Upgrade →" button.

Props:
```ts
{
  feature: "moods" | "stock" | "premium-quality" | "generic";
  label?: string; // overrides default label text
}
```

Renders the existing locked-state label text + an "Upgrade →" button that opens `UpgradeModal` internally (owns its own `open` state).

## Placement

| Location | File | Change |
|---|---|---|
| Generate page — moods row | `generate-shell.tsx` or `quick-create.tsx` | Replace plain text with `<UpgradeInline feature="moods" />` |
| Generate page — premium quality (QuickCreate) | `quick-create.tsx` | Replace subtitle text with `<UpgradeInline feature="premium-quality" />` |
| Generate page — premium quality (campaign builder) | `preflight-panel.tsx` or similar | Replace locked text with `<UpgradeInline feature="premium-quality" />` |
| Moods page | `apps/web/app/(app)/moods/page.tsx` or moods client component | Add "Unlock Moods →" button → `<UpgradeModal feature="moods" />` |
| Stock library | `apps/web/app/(app)/stock/page.tsx` or stock client component | Add "Unlock Stock Library →" button → `<UpgradeModal feature="stock" />` |

## Styling

- Modal overlay: `position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.5)`
- Modal card: white, `max-width: 440px`, centered, `border-radius: 12px`
- Pack buttons: full-width, outlined style; Subscribe button: filled/primary style
- "Upgrade →" inline button: small, ghost/link style, sits inline after the locked-state text

All new classes go in `cal-layertone.css`.

## What this does NOT include

- Any change to the Stripe webhook or billing logic (already works)
- A redirect-and-return flow (not needed; PAYG activates instantly on topup)
- Changing the `/billing` page itself
- Any new API endpoints
