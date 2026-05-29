"use client";

import { useState, useEffect } from "react";

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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
      <div className="upgrade-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
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
