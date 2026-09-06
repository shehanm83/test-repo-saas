"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { I } from "@/components/icons";
import {
  AdminAlert,
  AdminPage,
  AdminSection,
  AdminStat,
  AdminStatGrid,
  formatAdminNumber,
} from "@/components/admin/ui";

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
  paygActionMarkup: number;
  paygRetentionDaysPerCredit: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    modelCode: "flux-1.1-pro",
    sizeBucket: "standard",
    premiumFlag: false,
    hasInspirationFlag: false,
    credits: 5,
    version: 1,
  });

  async function submit() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/pricebook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, effectiveFrom: new Date().toISOString() }),
      });
      if (!res.ok) {
        setMessage({ ok: false, text: await res.text() });
        return;
      }
      setMessage({ ok: true, text: "Price version added." });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage
      eyebrow={
        <>
          <I.Coin size={12} />
          Commerce
        </>
      }
      title="Pricebook"
      description="Versioned credit pricing across model, size, premium mode, and inspiration usage."
    >
      <AdminStatGrid>
        <AdminStat
          label="Rows"
          value={formatAdminNumber(props.rows.length)}
          detail="Configured price rules"
          icon={<I.Database size={14} />}
        />
        <AdminStat
          label="PAYG Markup"
          value={`${props.paygActionMarkup.toFixed(1)}x`}
          detail="Applied to base action credits"
          icon={<I.TrendUp size={14} />}
          tone="accent"
        />
        <AdminStat
          label="Retention"
          value={`${formatAdminNumber(props.paygRetentionDaysPerCredit)} days`}
          detail="Per PAYG retention credit"
          icon={<I.Calendar size={14} />}
        />
        <AdminStat
          label="Latest Version"
          value={`v${formatAdminNumber(Math.max(0, ...props.rows.map((row) => row.version)))}`}
          detail="Highest version in this table"
          icon={<I.Hash size={14} />}
        />
      </AdminStatGrid>

      <AdminSection title="Active Pricing Model">
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, fontSize: 13 }}
        >
          <div>
            <strong>Subscription actions</strong>
            <p style={{ margin: "6px 0 0", color: "var(--fg-3)" }}>
              Use the base pricebook credits shown below.
            </p>
          </div>
          <div>
            <strong>PAYG actions</strong>
            <p style={{ margin: "6px 0 0", color: "var(--fg-3)" }}>
              Base credits × {props.paygActionMarkup.toFixed(1)}, rounded up to whole credits.
            </p>
          </div>
          <div>
            <strong>PAYG retention</strong>
            <p style={{ margin: "6px 0 0", color: "var(--fg-3)" }}>
              1 credit keeps retained assets for {props.paygRetentionDaysPerCredit} days.
            </p>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Add Price Version" description="Create a new effective pricebook entry.">
        {message ? (
          <AdminAlert tone={message.ok ? "success" : "danger"}>{message.text}</AdminAlert>
        ) : null}
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
              name="modelCode"
              autoComplete="off"
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
              name="credits"
              inputMode="numeric"
              value={form.credits}
              onChange={(e) => setForm((c) => ({ ...c, credits: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="label">Version</label>
            <input
              className="input"
              type="number"
              name="version"
              inputMode="numeric"
              value={form.version}
              onChange={(e) => setForm((c) => ({ ...c, version: Number(e.target.value) }))}
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
              onChange={(e) => setForm((c) => ({ ...c, premiumFlag: e.target.checked }))}
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
              onChange={(e) => setForm((c) => ({ ...c, hasInspirationFlag: e.target.checked }))}
            />
            <span style={{ fontSize: 13 }}>Has inspiration</span>
          </label>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void submit()}
          disabled={saving}
        >
          <I.Plus size={14} />
          {saving ? "Adding…" : "Add Price Version"}
        </button>
      </AdminSection>

      <AdminSection title="Price Rules" flush>
        <table className="admin-table">
          <thead>
            <tr>
              {["Model", "Bucket", "Premium", "Inspiration", "Credits", "Version"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.modelCode}</td>
                <td>{row.sizeBucket}</td>
                <td>{row.premiumFlag ? <I.Check size={14} /> : "—"}</td>
                <td>{row.hasInspirationFlag ? <I.Check size={14} /> : "—"}</td>
                <td className="mono admin-num">{row.credits}</td>
                <td className="admin-num">v{row.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminSection>
    </AdminPage>
  );
}
