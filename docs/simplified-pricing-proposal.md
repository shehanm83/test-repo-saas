# Simplified Pricing Proposal

Date: 2026-05-24

## Summary

Replace the current five-plan pricing ladder with three customer choices:

| Option | Customer job | Revenue model | Product posture |
|---|---|---|---|
| Free | Try the product and understand output quality | No payment | Small trial, intentionally limited |
| Subscription | Use Layertone as an ongoing image production workspace | Monthly subscription with included credits | Best value, full product experience |
| Pay As You Go | Use the product occasionally without a plan | Purchased credits, spent on actions and retained assets | Flexible, but less generous than subscription |

This keeps the pricing page easy to understand while still supporting the credit ledger already in the product. The key change is to treat credits as the single internal meter, but expose two types of credit consumption:

- Action credits: charged once when the user asks the system to do work, such as image generation, mood application, caption generation, or premium model use.
- Retention credits: charged over time when the user asks Layertone to keep ongoing workspace value, such as saved projects, previous image history, reusable campaign assets, or long-term storage.

## Goals

- Make the pricing page explainable in one screen.
- Give new users a real free trial without giving away premium model cost.
- Make subscription the default recommended path for serious users.
- Keep PAYG available for occasional customers without letting it become a cheaper substitute for subscription.
- Preserve the current ledger, price book, Stripe checkout, and top-up architecture as much as possible.

## Proposed Customer Options

### 1. Free

Free should answer one question: "Can this product create something useful for my business?"

Recommended limits:

| Area | Free behavior |
|---|---|
| Price | $0 |
| Starter credits | 20 one-time credits |
| Monthly refresh | None, or very small refresh such as 5 credits/month |
| Image models | Standard model only |
| Premium models | Not available |
| Moods | Not available |
| Description/caption generation | Limited or disabled |
| Saved projects | Not available |
| Generation history | Temporary only, for example 7 days |
| Previous image storage | Temporary only |
| Stock library | Limited basic stock set |
| Brands | 1 brand |
| Seats | 1 user |
| Exports | Normal export, but no batch/package workflow |

Product reasoning:

- Free should let users create enough to evaluate quality, not run marketing production.
- Removing moods and premium models keeps the trial cost predictable.
- No saved projects makes the upgrade reason obvious: subscribe when the user wants a durable workspace.

### 2. Subscription

Subscription should be the clean default for real customers. Instead of Starter, Pro, Business, and Agency on the public page, offer one primary plan at launch.

Recommended plan:

| Area | Subscription behavior |
|---|---|
| Price | Suggested test range: $29-$49/month |
| Included credits | Suggested test range: 750-1,500 credits/month |
| Monthly refresh | New credits granted each month; unused subscription credits expire at period end |
| Image models | Standard and premium models available |
| Moods | Full mood library |
| Description/caption generation | Available |
| Saved projects | Included up to a fair-use limit |
| Generation history | Included, for example 12 months |
| Previous image storage | Included up to a fair-use limit |
| Stock library | Full stock library |
| Brands | Suggested: 3 included |
| Seats | Suggested: 1-3 included |
| PAYG top-ups | Available when included credits run out |

Product reasoning:

- A single subscription plan removes comparison friction.
- Included retention makes subscription feel like a workspace, not just a generation machine.
- Premium models and moods become clear subscription value drivers.
- Top-ups still work for spikes, but the monthly plan remains the best normal usage option.

Future expansion:

- Keep "Business" or "Agency" as sales-assisted plans, not public pricing cards at launch.
- Add extra seats, extra brands, or higher retention as add-ons only after usage data proves demand.

### 3. Pay As You Go

PAYG should be a flexible credit wallet. It should not require a monthly subscription, but it should not include ongoing storage or workspace benefits for free.

Recommended PAYG behavior:

| Area | PAYG behavior |
|---|---|
| Price | Buy credits as needed |
| Credit expiry | No expiry for purchased PAYG credits |
| Image models | Standard and premium models available at PAYG action pricing |
| Moods | Available as paid action or surcharge |
| Description/caption generation | Available as paid action |
| Saved projects | Available, but consumes retention credits |
| Generation history | Short free window, then retention credits |
| Previous image storage | Short free window, then retention credits |
| Stock library | Full stock library, same as subscription |
| Brands | 1 included; additional brand kits can cost retention credits |
| Seats | 1 user by default |

PAYG should have two credit charges:

| Charge type | Examples | Billing timing |
|---|---|---|
| Action credits | Generate image, use premium model, apply mood, generate captions, regenerate variant, upload inspiration image | Charged once at request time |
| Retention credits | Keep saved projects, keep previous images, keep campaign assets, keep extra brands, keep long history | Charged as day slots, for example 1 credit buys 5 or 10 retention days |

Product reasoning:

- Occasional users can buy one credit pack and use it without a subscription.
- Heavy users naturally discover that subscription is cheaper and simpler.
- Retention charges prevent PAYG accounts from becoming unlimited free storage.

## Credit Price Book Proposal

These numbers are directional and should be tested against provider cost.

### Action Credit Costs

| Action | Free | Subscription | PAYG |
|---|---:|---:|---:|
| Standard image generation | 5 credits | 5 credits | 6 credits |
| Premium image generation | Not available | 15 credits | 18 credits |
| Design/typographic model | Not available | 8 credits | 10 credits |
| Mood selection/application | Not available | Included or 1 credit | 1-2 credits |
| Premium mood | Not available | 2 credits | 3 credits |
| Caption/description, short | Limited | 1 credit | 1 credit |
| Caption/description, medium | Not available | 3 credits | 4 credits |
| Caption/description, long | Not available | 5 credits | 6 credits |
| Inspiration-image surcharge | Not available | +2 credits | +3 credits |
| Regenerate one variant | Same as model | Same as model | Same as PAYG model price |
| Re-render with same background | Not available | Free or 1 credit | 1 credit |

PAYG action costs should be higher than subscription action costs, but not dramatically higher. A good starting rule is a roughly 20% PAYG uplift, rounded to whole credits. For tiny 1-credit actions, either keep the PAYG price at 1 credit or bundle the feature so rounding does not create a confusing 100% markup.

The subscription advantage should come from three places:

- Lower action credit cost.
- Monthly included credits.
- Included retention for saved projects, previous images, and workspace history.

PAYG remains attractive for occasional users because purchased credits do not expire.

### AWS Retention Cost Inputs

Retention pricing should not be finalized until real AWS cost is estimated from expected asset sizes and user behavior.

Cost inputs to model:

| Cost input | Why it matters |
|---|---|
| S3 storage GB-month | Raw generated image, final rendered image, thumbnails, uploaded references, logo/product assets |
| S3 request cost | PUT on upload/render, GET on preview/download, LIST during browsing/admin tools |
| CDN/data transfer | User preview and download traffic can cost more than raw storage |
| Database storage | Project rows, generation metadata, prompt snapshots, ledger entries |
| Background jobs | Retention sweep, expiry, archive, restore |
| Support/abuse overhead | Large inactive workspaces, repeated downloads, bot storage abuse |

Initial hypothesis:

- Raw S3 storage alone will probably be cheap enough that 10 retained days per credit is viable.
- If users frequently download large images, keep many raw backgrounds, or store product/reference assets, 5 retained days per credit may be safer.
- The final number should be set after measuring average bytes per generation package and expected download frequency.

### Retention Credit Costs

Retention should be simple enough that users do not feel surprised.

Recommended approach:

- Free: no paid retention; history auto-expires.
- Subscription: retention included up to fair-use limits.
- PAYG: purchased credits do not expire, but retained assets consume day-slot credits after the free temporary window.

Before choosing the retention rate, calculate actual AWS storage, request, transfer, and metadata cost. The raw S3 storage cost is usually low, but downloads, previews, CDN egress, and operational overhead still matter.

Possible PAYG retention slot models:

| Slot model | Meaning | When to choose |
|---|---:|---|
| 1 credit = 5 retained days | Higher retention price; stronger subscription incentive | Use if storage, egress, support, or abuse risk is material |
| 1 credit = 10 retained days | More generous PAYG retention; lower support friction | Use if AWS cost analysis shows retained assets are cheap |

Better UX option:

Offer retention as a simple day-slot balance instead of many small meters:

| Retention item | Suggested treatment |
|---|---:|---|
| Saved project | Consumes retained days while active |
| Previous generated image | Consumes retained days after the free history window |
| Extra brand kit | Consumes retained days while active |
| Long history archive | Can consume retained days from a shared workspace retention pool |

This is easier to explain than many micro-rentals. Internally, it can still be implemented as recurring or daily ledger entries.

### Retention Charging Mechanics

There are two workable approaches:

| Approach | User experience | Engineering impact | Recommendation |
|---|---|---|---|
| Day-slot retention | Precise enough; user sees that credits buy retained days | Requires periodic retention job and clear expiry UI | Use for PAYG MVP |
| Monthly retention bundle | Easy to explain; one visible workspace-keeping charge | Simpler ledger, less precise for occasional users | Keep as fallback |

Recommended MVP rule:

- PAYG users get 7 days of free temporary history after each generation.
- After 7 days, they can either let old assets expire or spend retention credits.
- Start with either 1 credit = 5 retained days or 1 credit = 10 retained days, after AWS cost analysis.
- If the balance cannot cover the next retention slot, retained assets enter a 14-day grace period.
- After the grace period, unsaved temporary assets can be deleted or moved to cold archive depending on storage policy.

Monthly retention bundles can be added later if day slots create too much UI complexity.

## Recommended Pricing Page Shape

Use three cards:

### Free

Headline: "Try Layertone"

Positioning:

- 20 starter credits
- Standard image generation only
- Basic stock library
- No moods
- No premium image models
- No saved projects
- Temporary history

Primary CTA: "Start free"

### Subscription

Headline: "Create every month"

Positioning:

- Monthly credit grant
- Full mood library
- Premium models
- Captions and descriptions
- Saved projects
- Previous image history
- Full stock library
- Best credit value

Primary CTA: "Subscribe"

This should be marked as recommended.

### Pay As You Go

Headline: "Buy credits when needed"

Positioning:

- No monthly subscription
- Credits for image generation, moods, captions, and premium models
- Optional retention credits for saved projects and old images
- Good for occasional campaigns

Primary CTA: "Buy credits"

## Upgrade And Conversion Rules

Free to Subscription:

- Keep any temporary generations created in the last 7 days.
- Convert them into saved history after subscription starts.
- Unlock moods, premium models, saved projects, and full stock.

Free to PAYG:

- User buys credits.
- Standard and PAYG premium actions become available.
- Saved projects remain disabled until the user opts into PAYG retention or spends credits to save.

PAYG to Subscription:

- Keep purchased credit balance.
- Stop retention charges while subscription is active, up to fair-use limits.
- Subscription monthly credits are consumed before purchased credits if they expire.

Subscription to PAYG:

- At period end, stop monthly grants.
- Keep purchased top-up credits.
- Start a grace period, for example 14 days, before retention charges begin.
- If credit balance reaches zero, workspace becomes read-only and old retained assets enter expiry policy.

## Billing And Ledger Implications

The existing ledger can support this model, but it needs clearer entry kinds and metadata.

Recommended ledger entry categories:

| Kind | Purpose |
|---|---|
| grant | Subscription monthly credit grant |
| topup | PAYG or subscription top-up credit purchase |
| reserve | Temporary hold before async work completes |
| commit | Final action credit spend |
| release | Return reserved credits after failure |
| retention | Recurring credit spend for PAYG retained assets |
| adjustment | Admin correction, expiry, migration, or refund balancing |

The current price book should be extended from only generation model costs to a broader action catalog:

- image.standard
- image.premium
- image.design
- image.inspiration_surcharge
- mood.standard
- mood.premium
- caption.short
- caption.medium
- caption.long
- project.retention
- image_history.retention
- brand_kit.retention
- workspace_retention.bundle

## Product Entitlements

Add explicit entitlement checks rather than relying only on credit balance.

Recommended entitlement flags:

| Entitlement | Free | Subscription | PAYG |
|---|---|---|---|
| standard_generation | Yes | Yes | Yes |
| premium_generation | No | Yes | Yes, PAYG action price |
| moods | No | Yes | Yes, PAYG action price |
| premium_moods | No | Yes | Yes, PAYG action price |
| captions | Limited | Yes | Yes, credit cost |
| saved_projects | No | Yes | Yes, with retention |
| full_stock_library | No | Yes | Yes |
| temporary_history | Yes | Yes | Yes |
| long_history | No | Yes | Yes, with retention |
| extra_brands | No | Included or add-on | Retention credits |

## Open Decisions

- Should PAYG premium models be available immediately, or require account age/payment verification?
- Should PAYG action pricing be exactly 20% higher than subscription, or should each action be rounded manually?
- Should retention be 5 retained days per credit or 10 retained days per credit after AWS cost analysis?
- What fair-use limits should subscription include for projects, images, and storage?

## Recommended MVP

For launch, keep it very simple:

1. Public pricing has only Free, Subscription, and Pay As You Go.
2. Free gets 20 starter credits, standard model only, no moods, no saved projects, temporary 7-day history.
3. Subscription gets 1,000 monthly credits that expire each month, full moods, premium models, saved projects, full stock, and 12-month history.
4. PAYG users buy non-expiring credit packs and spend them on actions.
5. PAYG action pricing starts around 20% higher than subscription action pricing.
6. PAYG retention uses day slots, with the exact 5-day or 10-day credit rate decided after AWS cost analysis.
7. Add detailed per-item retention later only if customers ask for more control.

This gives the business a simple story now, while leaving room for enterprise or agency pricing later without confusing the first launch.
