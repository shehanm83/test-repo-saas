# Free → PAYG Upgrade Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give free-plan users actionable "Upgrade →" CTAs at every locked-feature touchpoint, opening a modal with topup packs and a subscribe button.

**Architecture:** Two new client components (`UpgradeModal`, `UpgradeInline`) in `apps/web/components/billing/`. Five existing files are modified to replace static locked-state text with these components. No new API routes — checkout is triggered via existing `POST /api/billing/topup` and `POST /api/billing/subscription`.

**Tech Stack:** Next.js App Router, React client components (`"use client"`), existing CSS utility classes (`btn`, `btn--accent`, `btn--secondary`, `btn--sm`).

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `apps/web/components/billing/upgrade-modal.tsx` | Full-screen modal with 3 topup packs + subscribe button |
| Create | `apps/web/components/billing/upgrade-inline.tsx` | Inline locked-state label + "Upgrade →" button |
| Modify | `apps/web/app/cal-layertone.css` | CSS for modal overlay/dialog and inline CTA |
| Modify | `apps/web/components/moods/moods-browser.tsx` | Add "Unlock Moods →" button to locked state card |
| Modify | `apps/web/app/(app)/stock/page.tsx` | Add upgrade CTA to free locked-state text |
| Modify | `apps/web/components/generate/commercial/quick-create.tsx` | Replace two locked-state texts with `UpgradeInline` |

---

### Task 1: Create UpgradeModal component

**Files:**
- Create: `apps/web/components/billing/upgrade-modal.tsx`
- Modify: `apps/web/app/cal-layertone.css`

The modal is a client component. Pack config is hardcoded (not imported from `@layertone/billing` — that package is server-only in this app). Checkout mirrors the `buyTopup` / `changePlan` pattern in `apps/web/components/billing/billing-page.tsx`.

- [ ] **Step 1: Create the component file**

```tsx
// apps/web/components/billing/upgrade-modal.tsx
"use client";

import { useState } from "react";

type Feature = "moods" | "stock" | "premium-quality" | "generic";

const COPY: Record<Feature, { headline: string; description: string }> = {
  moods: {
    headline: "Unlock Moods",
    description: "Moods require credits or a subscription.",
  },
  stock: {
    headline: "Unlock Stock Library",
    description: "Stock images require credits or a subscription.",
  },
  "premium-quality": {
    headline: "Unlock Premium Quality",
    description: "Premium quality requires credits or a subscription.",
  },
  generic: {
    headline: "Upgrade your plan",
    description: "This feature requires credits or a subscription.",
  },
};

const PACKS: Array<{ code: string; credits: number; priceUsd: number }> = [
  { code: "p200", credits: 200, priceUsd: 9 },
  { code: "p750", credits: 750, priceUsd: 29 },
  { code: "p2500", credits: 2500, priceUsd: 79 },
];

export function UpgradeModal({
  feature,
  open,
  onClose,
}: {
  feature: Feature;
  open: boolean;
  onClose: () => void;
}) {
  const [pendingTopup, setPendingTopup] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[feature];

  if (!open) return null;

  async function buyTopup(packCode: string) {
    setPendingTopup(packCode);
    setError(null);
    try {
      const r = await fetch("/api/billing/topup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packCode }),
      });
      const json = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !json.url) {
        setError(json.error ?? "Checkout failed. Please try again.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPendingTopup(null);
    }
  }

  async function subscribe() {
    setPendingPlan(true);
    setError(null);
    try {
      const r = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planCode: "subscription" }),
      });
      const json = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !json.url) {
        setError(json.error ?? "Checkout failed. Please try again.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPendingPlan(false);
    }
  }

  const busy = pendingTopup !== null || pendingPlan;

  return (
    <div className="upgrade-overlay" onClick={onClose}>
      <div className="upgrade-dialog" onClick={(e) => e.stopPropagation()}>
        <button
          className="upgrade-dialog__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="upgrade-dialog__headline">{copy.headline}</h2>
        <p className="upgrade-dialog__desc">{copy.description}</p>
        <div className="upgrade-dialog__packs">
          {PACKS.map((pack) => (
            <button
              key={pack.code}
              className="btn btn--secondary upgrade-pack-btn"
              onClick={() => void buyTopup(pack.code)}
              disabled={busy}
            >
              <span className="upgrade-pack-btn__credits">
                {pack.credits.toLocaleString()} credits
              </span>
              <span className="upgrade-pack-btn__price">
                ${pack.priceUsd}
                {pendingTopup === pack.code ? " …" : ""}
              </span>
            </button>
          ))}
        </div>
        <div className="upgrade-dialog__divider">or</div>
        <button
          className="btn btn--accent upgrade-subscribe-btn"
          onClick={() => void subscribe()}
          disabled={busy}
        >
          {pendingPlan ? "Redirecting…" : "Subscribe — $49 / month"}
        </button>
        {error ? <p className="upgrade-dialog__error">{error}</p> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS to `apps/web/app/cal-layertone.css`**

Append these rules at the end of the file (before the final `}` of any media query block — just append at the very bottom):

```css
/* ── Upgrade modal ─────────────────────────────────────────────── */
.upgrade-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
}

.upgrade-dialog {
  position: relative;
  background: var(--cal-white);
  border-radius: 12px;
  padding: 32px;
  max-width: 440px;
  width: calc(100vw - 32px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
}

.upgrade-dialog__close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--fg-3);
  line-height: 1;
  padding: 4px;
}

.upgrade-dialog__headline {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
}

.upgrade-dialog__desc {
  margin: 0 0 24px;
  color: var(--fg-2);
  font-size: 14px;
}

.upgrade-dialog__packs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.upgrade-pack-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 44px;
  padding: 0 16px;
}

.upgrade-pack-btn__credits {
  font-weight: 600;
}

.upgrade-pack-btn__price {
  color: var(--fg-2);
}

.upgrade-dialog__divider {
  text-align: center;
  color: var(--fg-3);
  font-size: 13px;
  margin-bottom: 16px;
}

.upgrade-subscribe-btn {
  width: 100%;
  height: 44px;
}

.upgrade-dialog__error {
  margin: 12px 0 0;
  font-size: 13px;
  color: #d32f2f;
}

/* ── Upgrade inline CTA ────────────────────────────────────────── */
.upgrade-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--fg-2);
}

.upgrade-inline__btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--layertone-violet);
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  text-decoration: underline;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/billing/upgrade-modal.tsx apps/web/app/cal-layertone.css
git commit -m "feat: add UpgradeModal component"
```

---

### Task 2: Create UpgradeInline component

**Files:**
- Create: `apps/web/components/billing/upgrade-inline.tsx`

`UpgradeInline` owns its own `open` state and renders `UpgradeModal` internally. It accepts an optional `label` (text shown before the button) and an optional `buttonLabel` (default: `"Upgrade →"`).

- [ ] **Step 1: Create the component file**

```tsx
// apps/web/components/billing/upgrade-inline.tsx
"use client";

import { useState } from "react";

import { UpgradeModal } from "./upgrade-modal";

type Feature = "moods" | "stock" | "premium-quality" | "generic";

export function UpgradeInline({
  feature,
  label,
  buttonLabel = "Upgrade →",
}: {
  feature: Feature;
  label?: string;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="upgrade-inline">
        {label ? <>{label}{" "}</> : null}
        <button
          type="button"
          className="upgrade-inline__btn"
          onClick={() => setOpen(true)}
        >
          {buttonLabel}
        </button>
      </span>
      <UpgradeModal feature={feature} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/billing/upgrade-inline.tsx
git commit -m "feat: add UpgradeInline component"
```

---

### Task 3: Wire moods-browser locked state

**Files:**
- Modify: `apps/web/components/moods/moods-browser.tsx`

The component is already a client component. Add `upgradeOpen` state and replace the static locked-state card with one that includes an "Unlock Moods →" button. The `UpgradeModal` is rendered at component root (not inside the card) to avoid stacking-context issues from any parent `backdrop-filter`.

- [ ] **Step 1: Add import for `UpgradeModal`**

In `apps/web/components/moods/moods-browser.tsx`, the imports block currently starts with:

```tsx
"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";
```

Add the `UpgradeModal` import:

```tsx
"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
```

- [ ] **Step 2: Add `upgradeOpen` state**

Inside `MoodsBrowser`, after the existing `useState` lines:

```tsx
export function MoodsBrowser({ moods, locked = false }: { moods: Mood[]; locked?: boolean }) {
  const [tab, setTab] = useState<"all" | "now" | "always" | "soon">("all");
  const [search, setSearch] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
```

- [ ] **Step 3: Replace the locked-state card**

Find this block (around line 60):

```tsx
      {locked ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Lock size={28} />
          </div>
          <div className="empty__title">Moods are not available on Free</div>
          <div className="empty__sub">Subscribe or buy credits to unlock the full mood library.</div>
        </div>
      ) : null}
```

Replace with:

```tsx
      {locked ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Lock size={28} />
          </div>
          <div className="empty__title">Moods are not available on Free</div>
          <div className="empty__sub">Subscribe or buy credits to unlock the full mood library.</div>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn--accent btn--sm"
              onClick={() => setUpgradeOpen(true)}
            >
              Unlock Moods →
            </button>
          </div>
        </div>
      ) : null}
```

- [ ] **Step 4: Add `UpgradeModal` at component root**

Find the outermost `return (` and its wrapping `<div>`. Add `UpgradeModal` as the last child inside that wrapper div:

```tsx
      <UpgradeModal
        feature="moods"
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
```

The full return should end like this:

```tsx
  return (
    <div className="...">
      {/* ... all existing content ... */}
      <UpgradeModal
        feature="moods"
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/moods/moods-browser.tsx
git commit -m "feat: add upgrade CTA to moods locked state"
```

---

### Task 4: Wire stock page locked state

**Files:**
- Modify: `apps/web/app/(app)/stock/page.tsx`

The stock page is a server component. Client components can be imported and used as leaves in server components. Add `UpgradeInline` to the subtitle paragraph shown when `isFree` is true.

- [ ] **Step 1: Add `UpgradeInline` import**

In `apps/web/app/(app)/stock/page.tsx`, add to the imports:

```tsx
import { UpgradeInline } from "@/components/billing/upgrade-inline";
```

The imports block currently looks like:

```tsx
import { billingSegmentFor } from "@layertone/billing";
import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";

import { I } from "@/components/icons";
import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";
```

Add the `UpgradeInline` import after the local imports:

```tsx
import { billingSegmentFor } from "@layertone/billing";
import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";

import { I } from "@/components/icons";
import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";
import { UpgradeInline } from "@/components/billing/upgrade-inline";
```

- [ ] **Step 2: Replace the locked-state subtitle**

Find this block (around line 33):

```tsx
          <p className="page__sub">
            {isFree
              ? "Free workspaces can preview a limited stock set. Subscription and PAYG unlock the full library."
              : "Curated stock used by moods, templates, and editorial references."}
          </p>
```

Replace with:

```tsx
          <p className="page__sub">
            {isFree ? (
              <>
                Free workspaces can preview a limited stock set.{" "}
                <UpgradeInline
                  feature="stock"
                  buttonLabel="Unlock the full library →"
                />
              </>
            ) : (
              "Curated stock used by moods, templates, and editorial references."
            )}
          </p>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(app)/stock/page.tsx
git commit -m "feat: add upgrade CTA to stock locked state"
```

---

### Task 5: Wire generate page locked states (QuickCreate)

**Files:**
- Modify: `apps/web/components/generate/commercial/quick-create.tsx`

Two locked states to update:

**A. Moods section** — currently shows plain text "Moods are not available on the Free plan." (around line 820). Replace with `UpgradeInline`.

**B. Premium quality subtitle** — currently shows "Upgrade or buy credits" text inside the disabled premium button (around line 515). The button is `disabled` so clicking does nothing. Add a separate `UpgradeInline` below the quality grid instead (no nested buttons — that's invalid HTML).

- [ ] **Step 1: Add `UpgradeInline` import**

In `apps/web/components/generate/commercial/quick-create.tsx`, add to the imports. The file currently imports from `@/components/...` — add alongside those:

```tsx
import { UpgradeInline } from "@/components/billing/upgrade-inline";
```

- [ ] **Step 2: Update moods locked-state text**

Find (around line 820):

```tsx
      {props.disabled ? (
        <div className="qc-empty-note">Moods are not available on the Free plan.</div>
      ) : null}
```

Replace with:

```tsx
      {props.disabled ? (
        <div className="qc-empty-note">
          <UpgradeInline
            feature="moods"
            label="Moods are not available on the Free plan."
          />
        </div>
      ) : null}
```

- [ ] **Step 3: Update premium quality locked-state text**

Find the closing `</div>` of the quality tier `<div>` block (around line 523). The structure is:

```tsx
          <div>
            <span className="qc-gen-label">Quality tier</span>
            <div className="qc-quality-grid">
              {(["standard", "premium"] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={q === "premium" && premiumDisabled}
                  className={`qc-gen-option ${outputs.quality === q ? "is-active" : ""}`}
                  onClick={() =>
                    props.onOutputsChange({
                      ...outputs,
                      quality: q,
                    })
                  }
                >
                  <strong>{q === "standard" ? "Standard" : "Premium"}</strong>
                  <span>
                    {q === "premium" && premiumDisabled
                      ? "Upgrade or buy credits"
                      : q === "standard"
                        ? "5+ credits / image"
                        : "15+ credits / image"}
                  </span>
                </button>
              ))}
            </div>
          </div>
```

Replace the entire `<div>` (quality tier section) with:

```tsx
          <div>
            <span className="qc-gen-label">Quality tier</span>
            <div className="qc-quality-grid">
              {(["standard", "premium"] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={q === "premium" && premiumDisabled}
                  className={`qc-gen-option ${outputs.quality === q ? "is-active" : ""}`}
                  onClick={() =>
                    props.onOutputsChange({
                      ...outputs,
                      quality: q,
                    })
                  }
                >
                  <strong>{q === "standard" ? "Standard" : "Premium"}</strong>
                  <span>
                    {q === "premium" && premiumDisabled
                      ? "Premium locked"
                      : q === "standard"
                        ? "5+ credits / image"
                        : "15+ credits / image"}
                  </span>
                </button>
              ))}
            </div>
            {premiumDisabled ? (
              <div style={{ marginTop: 8 }}>
                <UpgradeInline
                  feature="premium-quality"
                  label="Premium quality requires credits."
                />
              </div>
            ) : null}
          </div>
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/generate/commercial/quick-create.tsx
git commit -m "feat: add upgrade CTAs to generate page locked states"
```

---

### Task 6: Wire campaign builder locked states

**Files:**
- Modify: `apps/web/components/generate/commercial/brand-mood-step.tsx`
- Modify: `apps/web/components/generate/commercial/output-settings-step.tsx`

Both are already client components. The campaign builder has its own locked-state labels for moods and premium quality — same pattern as QuickCreate but in separate component files.

- [ ] **Step 1: Add `UpgradeInline` import to `brand-mood-step.tsx`**

```tsx
import { UpgradeInline } from "@/components/billing/upgrade-inline";
```

- [ ] **Step 2: Replace moods locked text in `brand-mood-step.tsx`**

Find (around line 42):

```tsx
        {props.disabledMoods ? (
          <p className="qc-empty-note" style={{ margin: "6px 0 10px" }}>
            Moods are not available on the Free plan.
          </p>
        ) : null}
```

Replace with:

```tsx
        {props.disabledMoods ? (
          <p className="qc-empty-note" style={{ margin: "6px 0 10px" }}>
            <UpgradeInline
              feature="moods"
              label="Moods are not available on the Free plan."
            />
          </p>
        ) : null}
```

- [ ] **Step 3: Add `UpgradeInline` import to `output-settings-step.tsx`**

```tsx
import { UpgradeInline } from "@/components/billing/upgrade-inline";
```

- [ ] **Step 4: Replace premium locked label in `output-settings-step.tsx`**

Find the quality segmented control (around line 79):

```tsx
        <div>
          <span className="label">Quality</span>
          <div className="cg-segmented">
            {(["standard", "premium"] as const).map((quality) => (
              <button
                key={quality}
                type="button"
                disabled={quality === "premium" && props.premiumDisabled}
                className={props.value.quality === quality ? "is-selected" : ""}
                onClick={() => props.onChange({ ...props.value, quality })}
              >
                {quality === "premium" && props.premiumDisabled ? "premium locked" : quality}
              </button>
            ))}
          </div>
        </div>
```

Replace with:

```tsx
        <div>
          <span className="label">Quality</span>
          <div className="cg-segmented">
            {(["standard", "premium"] as const).map((quality) => (
              <button
                key={quality}
                type="button"
                disabled={quality === "premium" && props.premiumDisabled}
                className={props.value.quality === quality ? "is-selected" : ""}
                onClick={() => props.onChange({ ...props.value, quality })}
              >
                {quality === "premium" && props.premiumDisabled ? "Premium locked" : quality}
              </button>
            ))}
          </div>
          {props.premiumDisabled ? (
            <div style={{ marginTop: 8 }}>
              <UpgradeInline
                feature="premium-quality"
                label="Premium quality requires credits."
              />
            </div>
          ) : null}
        </div>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/generate/commercial/brand-mood-step.tsx apps/web/components/generate/commercial/output-settings-step.tsx
git commit -m "feat: add upgrade CTAs to campaign builder locked states"
```

---

### Task 7: Typecheck verification

- [ ] **Step 1: Build API (needed before web typecheck)**

```bash
pnpm --filter @layertone/api build
```

Expected: exits 0, no errors.

- [ ] **Step 2: Run web typecheck**

```bash
pnpm --filter @layertone/web typecheck
```

Expected: exits 0, no type errors.

- [ ] **Step 3: Commit if any fixes were needed**

If typecheck required any fixes, commit them:

```bash
git add -p
git commit -m "fix: typecheck issues in upgrade flow"
```
