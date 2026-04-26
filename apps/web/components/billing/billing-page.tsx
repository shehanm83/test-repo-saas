"use client";

import { useState } from "react";

export function BillingPage(props: {
  planCode: string;
  balance: number;
  sparkline: number[];
  invoices: Array<{ invoiceId: string; priceId: string | null }>;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function topup(packCode: "p200" | "p750" | "p2500") {
    setLoading(packCode);
    const response = await fetch("/api/billing/topup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packCode }),
    });
    const payload = await response.json();
    if (payload.url) {
      window.location.href = payload.url as string;
    }
    setLoading(null);
  }

  async function portal() {
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const payload = await response.json();
    if (payload.url) {
      window.location.href = payload.url as string;
    }
  }

  const points = props.sparkline
    .slice(0, 30)
    .map((value, index) => `${index * 20},${60 - Math.min(50, value)}`)
    .join(" ");

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>Billing & plan</h1>
          <p>Manage your subscription, credit balance, top-ups, and invoices.</p>
        </div>
      </div>

      <div className="studio-card studio-billing-hero">
        <div>
          <span className="generate-kicker">Current plan</span>
          <h2>{props.planCode.toUpperCase()}</h2>
          <p>Your current workspace plan and billing controls live here.</p>
        </div>
        <button className="studio-button studio-button--secondary" type="button" onClick={() => void portal()}>
          Manage in Stripe
        </button>
      </div>

      <div className="studio-card studio-copy-card">
        <h2>{props.balance.toLocaleString()} credits remaining</h2>
        <svg className="studio-sparkline" viewBox="0 0 600 60" preserveAspectRatio="none">
          <polyline fill="none" points={points} stroke="var(--violet)" strokeWidth="3" />
        </svg>
      </div>

      <div className="studio-billing-grid">
        {[
          ["p200", "200 credits", "$19"],
          ["p750", "750 credits", "$49"],
          ["p2500", "2,500 credits", "$129"],
        ].map(([packCode, label, price]) => (
          <article key={packCode} className="studio-topup-card">
            <strong>{label}</strong>
            <span>{price}</span>
            <button
              className="studio-button studio-button--secondary"
              disabled={loading === packCode}
              type="button"
              onClick={() => void topup(packCode as "p200" | "p750" | "p2500")}
            >
              {loading === packCode ? "Redirecting…" : "Buy pack"}
            </button>
          </article>
        ))}
      </div>

      <div className="studio-card">
        <div className="studio-card-head">
          <h2>Invoices</h2>
          <span>{props.invoices.length} total</span>
        </div>
        <div className="studio-table-wrap">
          <table className="studio-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {props.invoices.map((invoice) => (
                <tr key={invoice.invoiceId}>
                  <td>{invoice.invoiceId}</td>
                  <td>{invoice.priceId ?? "unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

