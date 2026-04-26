"use client";

import React, { useState } from "react";

import { I } from "@/components/icons";

interface Props {
  balance: number;
  invoices: Array<{ invoiceId: string; priceId: string | null; amount?: string; date?: string }>;
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
  const polygon = values.length
    ? `0,${h} ${points} ${w},${h}`
    : `0,${h} ${w},${h}`;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="var(--studio-violet)"
        strokeWidth={2}
      />
      <polygon points={polygon} fill="var(--studio-violet)" opacity={0.08} />
    </svg>
  );
}

export function BillingPage(props: Props) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [pendingTopup, setPendingTopup] = useState<string | null>(null);

  const currentPlan = props.plans.find((p) => p.code === props.planCode);
  const planLabel = currentPlan?.name ?? props.planCode;
  const planPrice = currentPlan?.price ?? 0;

  async function buyTopup(code: string) {
    setPendingTopup(code);
    try {
      const r = await fetch("/api/billing/topup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packCode: code }),
      });
      if (r.ok) {
        const json = (await r.json()) as { url?: string };
        if (json.url) window.location.href = json.url;
      }
    } finally {
      setPendingTopup(null);
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Billing &amp; plan</h1>
          <p className="page__sub">
            Manage your subscription, credits, and payment method.
          </p>
        </div>
      </div>

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
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                color: "var(--fg-3)",
              }}
            >
              ${planPrice}
              <span style={{ fontSize: 13, marginLeft: 2, color: "var(--fg-3)" }}>/mo</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <Stat label="Brands included" value={currentPlan?.brands ?? "—"} />
            <Stat label="Seats included" value={currentPlan?.seats ?? "—"} />
            <Stat
              label="Monthly credits"
              value={(currentPlan?.credits ?? props.monthlyCreditGrant).toLocaleString()}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setCompareOpen((o) => !o)}
          >
            Compare plans
          </button>
          <button type="button" className="btn btn--primary">
            Change plan
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
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
              Resets to {props.monthlyCreditGrant.toLocaleString()} on the 15th of each month.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn--ghost">
              View ledger
            </button>
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
            style={{
              position: "absolute",
              left: 16,
              top: 12,
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            Last 30 days · {props.sparkline.reduce((a, b) => a + b, 0)} credits used
          </div>
        </div>
      </div>

      <div id="topups" style={{ marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>
          Top-up packs
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {props.topupPacks.map((t) => (
            <div
              key={t.code}
              className="card"
              style={{ padding: 20, position: "relative" }}
            >
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
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>
                  ${t.priceUsd}
                </div>
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
        <div className="t-small" style={{ marginTop: 12 }}>
          <I.Info size={11} style={{ verticalAlign: "-1px" }} /> Top-up credits never expire.
        </div>
      </div>

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
                {["Invoice", "Date", "Amount", "Status", ""].map((h, i) => (
                  <th
                    key={i}
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
                <tr
                  key={iv.invoiceId}
                  style={{ borderTop: "1px solid var(--cal-gray-200)" }}
                >
                  <td
                    style={{
                      padding: "12px 24px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                    }}
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
                    <button type="button" className="btn btn--ghost btn--sm">
                      <I.Download size={12} />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          onClick={() => setCompareOpen((o) => !o)}
          style={{
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <div className="t-eyebrow" style={{ margin: 0 }}>
            Plan comparison
          </div>
          <I.ChevronDown
            size={14}
            style={{ transform: compareOpen ? "rotate(180deg)" : "" }}
          />
        </div>
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
                      }}
                    >
                      {p.name}
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
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--fg-3)" }}>Brands</td>
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
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
