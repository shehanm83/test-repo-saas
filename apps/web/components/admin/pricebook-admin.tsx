"use client";

import React, { useState } from "react";

import { I } from "@/components/icons";

export function PricebookAdmin(props: {
  rows: Array<{
    id: string;
    modelCode: string;
    sizeBucket: string;
    premiumFlag: boolean;
    hasInspirationFlag: boolean;
    credits: number;
    version: number;
  }>;
}) {
  const [form, setForm] = useState({
    modelCode: "flux-1.1-pro",
    sizeBucket: "standard",
    premiumFlag: false,
    hasInspirationFlag: false,
    credits: 5,
    version: 1,
  });

  async function submit() {
    await fetch("/api/admin/pricebook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, effectiveFrom: new Date().toISOString() }),
    });
    location.reload();
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Pricebook</h1>
          <p className="page__sub">
            Versioned credit pricing across model, size, premium mode, and inspiration
            usage.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h2
          className="t-h4"
          style={{ margin: "0 0 16px" }}
        >
          Add version
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <label className="label">Model</label>
            <input
              className="input mono"
              value={form.modelCode}
              onChange={(e) => setForm((c) => ({ ...c, modelCode: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Size bucket</label>
            <select
              className="select"
              value={form.sizeBucket}
              onChange={(e) => setForm((c) => ({ ...c, sizeBucket: e.target.value }))}
            >
              <option value="standard">standard</option>
              <option value="large">large</option>
            </select>
          </div>
          <div>
            <label className="label">Credits</label>
            <input
              className="input"
              type="number"
              value={form.credits}
              onChange={(e) =>
                setForm((c) => ({ ...c, credits: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className="label">Version</label>
            <input
              className="input"
              type="number"
              value={form.version}
              onChange={(e) =>
                setForm((c) => ({ ...c, version: Number(e.target.value) }))
              }
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              boxShadow: "var(--shadow-ring)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.premiumFlag}
              onChange={(e) =>
                setForm((c) => ({ ...c, premiumFlag: e.target.checked }))
              }
            />
            <span style={{ fontSize: 13 }}>Premium</span>
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              boxShadow: "var(--shadow-ring)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.hasInspirationFlag}
              onChange={(e) =>
                setForm((c) => ({ ...c, hasInspirationFlag: e.target.checked }))
              }
            />
            <span style={{ fontSize: 13 }}>Has inspiration</span>
          </label>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void submit()}
        >
          <I.Plus size={14} />
          Add row
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--cal-gray-50)" }}>
              {["Model", "Bucket", "Premium", "Inspiration", "Credits", "Version"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--fg-3)",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                <td
                  style={{
                    padding: "10px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                  }}
                >
                  {row.modelCode}
                </td>
                <td style={{ padding: "10px 16px" }}>{row.sizeBucket}</td>
                <td style={{ padding: "10px 16px" }}>
                  {row.premiumFlag ? <I.Check size={14} /> : "—"}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  {row.hasInspirationFlag ? <I.Check size={14} /> : "—"}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {row.credits}
                </td>
                <td style={{ padding: "10px 16px" }}>v{row.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
