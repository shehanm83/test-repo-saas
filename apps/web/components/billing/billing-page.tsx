"use client";

import React, { useState } from "react";

import { I } from "@/components/icons";

interface Invoice {
  invoiceId: string;
  priceId: string | null;
  amount: string | null;
  date: string | null;
  hostedInvoiceUrl: string | null;
}

interface Props {
  balance: number;
  invoices: Invoice[];
  planCode: string;
  sparkline: number[];
  topupPacks: Array<{ code: string; credits: number; priceUsd: number; best?: boolean }>;
  plans: Array<{
    code: string;
    name: string;
    price: number;
    brands: number;
    seats: number;
    credits: number;
    popular?: boolean;
  }>;
  monthlyCreditGrant: number;
  periodEnd: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{value}</div>
      <div className="t-small" style={{ fontSize: 11 }}>
        {label}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 600;
  const h = 60;
  const max = Math.max(1, ...values);
  const stride = w / Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => `${(i * stride).toFixed(1)},${(h - (v / max) * (h - 12)).toFixed(1)}`)
    .join(" ");
  const polygon = values.length ? `0,${h} ${points} ${w},${h}` : `0,${h} ${w},${h}`;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="var(--layertone-violet)" strokeWidth={2} />
      <polygon points={polygon} fill="var(--layertone-violet)" opacity={0.08} />
    </svg>
  );
}

function usePortalRedirect() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !json.url) {
        setError(json.error ?? "Failed to open billing portal. Please try again.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return { openPortal, pending, error, clearError: () => setError(null) };
}

export function BillingPage(props: Props) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [pendingTopup, setPendingTopup] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const portal = usePortalRedirect();

  const currentPlan = props.plans.find((p) => p.code === props.planCode);
  const planLabel = currentPlan?.name ?? props.planCode;
  const planPrice = currentPlan?.price ?? 0;

  const renewalLabel = (() => {
    if (!props.periodEnd) return null;
    const d = new Date(props.periodEnd);
    if (props.cancelAtPeriodEnd) {
      return `Cancels on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return `Renews on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  const creditResetLabel = props.periodEnd
    ? `Resets on ${new Date(props.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : props.planCode === "subscription"
      ? `${props.monthlyCreditGrant.toLocaleString()} credits / month`
      : props.planCode === "payg"
        ? "Purchased credits do not expire"
        : "Free starter credits only";

  async function changePlan(planCode: "free" | "subscription") {
    setPendingPlan(planCode);
    setPlanError(null);
    try {
      const r = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planCode }),
      });
      const json = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !json.url) {
        setPlanError(json.error ?? "Failed to start plan change. Please try again.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setPlanError("Network error. Please check your connection and try again.");
    } finally {
      setPendingPlan(null);
    }
  }

  async function buyTopup(code: string) {
    setPendingTopup(code);
    setTopupError(null);
    try {
      const r = await fetch("/api/billing/topup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packCode: code }),
      });
      const json = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !json.url) {
        setTopupError(json.error ?? "Failed to start checkout. Please try again.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setTopupError("Network error. Please check your connection and try again.");
    } finally {
      setPendingTopup(null);
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Billing &amp; plan</h1>
          <p className="page__sub">Manage your subscription, credits, and payment method.</p>
        </div>
      </div>

      {/* Section 1 — Current plan */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div>
          <div className="t-eyebrow">Current plan</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
            <h2 className="t-h2" style={{ margin: 0 }}>
              {planLabel}
            </h2>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--fg-3)" }}>
              ${planPrice}
              {props.planCode === "subscription" ? (
                <span style={{ fontSize: 13, marginLeft: 2, color: "var(--fg-3)" }}>/mo</span>
              ) : null}
            </span>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <Stat label="Brand limit" value={currentPlan?.brands ?? "—"} />
            <Stat label="Seats included" value={currentPlan?.seats ?? "—"} />
            <Stat
              label="Monthly credits"
              value={(currentPlan?.credits ?? props.monthlyCreditGrant).toLocaleString()}
            />
          </div>
          {renewalLabel ? (
            <div className="t-small" style={{ marginTop: 10, color: "var(--fg-3)" }}>
              {props.subscriptionStatus === "past_due" ? (
                <span style={{ color: "var(--color-error, #e53e3e)" }}>
                  <I.AlertTriangle size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                  Payment past due — update your payment method to avoid interruption
                </span>
              ) : (
                renewalLabel
              )}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setCompareOpen((o) => !o)}
            >
              Compare plans
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={portal.pending || pendingPlan !== null}
              onClick={() =>
                props.planCode === "subscription"
                  ? void portal.openPortal()
                  : void changePlan("subscription")
              }
            >
              {portal.pending || pendingPlan === "subscription"
                ? "Redirecting…"
                : props.planCode === "subscription"
                  ? "Change plan"
                  : "Subscribe"}
            </button>
          </div>
          {planError ? (
            <div style={{ fontSize: 13, color: "var(--color-error, #e53e3e)" }}>{planError}</div>
          ) : null}
        </div>
      </div>

      {/* Section 2 — Credits */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="t-eyebrow">Credits</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 48, marginTop: 4 }}>
              {props.balance.toLocaleString()}{" "}
              <span
                style={{
                  fontSize: 16,
                  color: "var(--fg-3)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 400,
                }}
              >
                credits remaining
              </span>
            </div>
            <div className="t-small" style={{ marginTop: 4 }}>
              {creditResetLabel}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a className="btn btn--accent" href="#topups">
              <I.Plus size={14} />
              Buy top-up credits
            </a>
          </div>
        </div>
        <div
          style={{
            marginTop: 24,
            height: 80,
            background: "var(--cal-gray-50)",
            borderRadius: 10,
            padding: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Sparkline values={props.sparkline} />
          <div
            style={{ position: "absolute", left: 16, top: 12, fontSize: 11, color: "var(--fg-3)" }}
          >
            Last 30 days · {props.sparkline.reduce((a, b) => a + b, 0)} credits used
          </div>
        </div>
      </div>

      {/* Section 3 — Top-up packs */}
      <div id="topups" style={{ marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>
          Top-up packs
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {props.topupPacks.map((t) => (
            <div key={t.code} className="card" style={{ padding: 20, position: "relative" }}>
              {t.best ? (
                <div
                  className="pill pill--accent"
                  style={{ position: "absolute", top: -10, left: 16 }}
                >
                  Best value
                </div>
              ) : null}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28 }}>
                {t.credits.toLocaleString()} credits
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>${t.priceUsd}</div>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={pendingTopup === t.code}
                  onClick={() => void buyTopup(t.code)}
                >
                  {pendingTopup === t.code ? "Redirecting…" : "Buy"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {topupError ? (
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--color-error, #e53e3e)" }}>
            {topupError}
          </div>
        ) : null}
        <div className="t-small" style={{ marginTop: 12 }}>
          <I.Info size={11} style={{ verticalAlign: "-1px" }} /> Top-up credits never expire. Buying
          a pack moves Free workspaces to Pay As You Go.
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>
          Pricing rules
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, fontSize: 13 }}
        >
          <div>
            <strong>Free</strong>
            <p style={{ margin: "6px 0 0", color: "var(--fg-3)" }}>
              20 starter credits, standard model only, no moods, no saved projects.
            </p>
          </div>
          <div>
            <strong>Subscription</strong>
            <p style={{ margin: "6px 0 0", color: "var(--fg-3)" }}>
              Monthly credits expire each period. Moods, premium models, full stock, saved projects,
              and retention are included.
            </p>
          </div>
          <div>
            <strong>Pay As You Go</strong>
            <p style={{ margin: "6px 0 0", color: "var(--fg-3)" }}>
              Credits never expire. Actions cost about 20% more than subscription, and retention
              uses day slots.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4 — Billing details */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>
          Billing details
        </div>
        <p style={{ fontSize: 14, color: "var(--fg-3)", margin: "0 0 16px" }}>
          Manage your payment method, billing address, tax ID, and subscription from the Stripe
          Customer Portal.
        </p>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={portal.pending}
          onClick={() => void portal.openPortal()}
        >
          {portal.pending ? "Opening portal…" : "Manage in Stripe Customer Portal"}
        </button>
        {portal.error ? (
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--color-error, #e53e3e)" }}>
            {portal.error}
          </div>
        ) : null}
      </div>

      {/* Section 5 — Invoices */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div
          style={{ padding: "16px 24px", borderBottom: "1px solid var(--cal-gray-200)" }}
          className="t-eyebrow"
        >
          Invoices
        </div>
        {props.invoices.length === 0 ? (
          <div style={{ padding: "24px", color: "var(--fg-3)", fontSize: 14 }}>
            No invoices yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--cal-gray-50)" }}>
                {["Invoice", "Date", "Amount", "Status", ""].map((h) => (
                  <th
                    key={h || "action"}
                    style={{
                      textAlign: "left",
                      padding: "10px 24px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--fg-3)",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.invoices.map((iv) => (
                <tr key={iv.invoiceId} style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                  <td
                    style={{ padding: "12px 24px", fontFamily: "var(--font-mono)", fontSize: 13 }}
                  >
                    {iv.invoiceId.slice(0, 12)}
                  </td>
                  <td style={{ padding: "12px 24px", fontSize: 14 }}>{iv.date ?? "—"}</td>
                  <td style={{ padding: "12px 24px", fontSize: 14 }}>{iv.amount ?? "—"}</td>
                  <td style={{ padding: "12px 24px" }}>
                    <span className="pill pill--green">
                      <I.Check size={11} />
                      Paid
                    </span>
                  </td>
                  <td style={{ padding: "12px 24px", textAlign: "right" }}>
                    {iv.hostedInvoiceUrl ? (
                      <a
                        href={iv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--ghost btn--sm"
                      >
                        <I.Download size={12} />
                        PDF
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 6 — Plan comparison (accordion) */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <button
          type="button"
          aria-expanded={compareOpen}
          onClick={() => setCompareOpen((o) => !o)}
          style={{
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            width: "100%",
            background: "none",
            border: "none",
            textAlign: "left",
          }}
        >
          <div className="t-eyebrow" style={{ margin: 0 }}>
            Plan comparison
          </div>
          <I.ChevronDown size={14} style={{ transform: compareOpen ? "rotate(180deg)" : "" }} />
        </button>
        {compareOpen ? (
          <div style={{ padding: "0 24px 24px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th />
                  {props.plans.map((p) => (
                    <th
                      key={p.code}
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        position: "relative",
                      }}
                    >
                      {p.name}
                      {p.popular ? (
                        <span
                          className="pill pill--accent"
                          style={{ marginLeft: 8, fontSize: 10, verticalAlign: "middle" }}
                        >
                          Popular
                        </span>
                      ) : null}
                      {p.code === props.planCode ? (
                        <span
                          className="pill pill--green"
                          style={{ marginLeft: 8, fontSize: 10, verticalAlign: "middle" }}
                        >
                          Current
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--fg-3)" }}>Price</td>
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "8px 16px" }}>
                      ${p.price}/mo
                      {p.code === "payg" ? " + credits" : ""}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--fg-3)" }}>Brand limit</td>
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "8px 16px" }}>
                      {p.brands}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--fg-3)" }}>Seats</td>
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "8px 16px" }}>
                      {p.seats === 999 ? "Unlimited" : p.seats}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--fg-3)" }}>Credits / mo</td>
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "8px 16px" }}>
                      {p.credits.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td />
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "12px 16px" }}>
                      {p.code === props.planCode ? (
                        <span style={{ fontSize: 13, color: "var(--fg-3)" }}>Current plan</span>
                      ) : p.code === "payg" ? (
                        <a className="btn btn--secondary btn--sm" href="#topups">
                          Buy credits
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          disabled={portal.pending || pendingPlan !== null}
                          onClick={() =>
                            void changePlan(p.code === "subscription" ? "subscription" : "free")
                          }
                        >
                          {pendingPlan === p.code
                            ? "Redirecting…"
                            : p.price > (currentPlan?.price ?? 0)
                              ? "Upgrade"
                              : "Switch"}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
