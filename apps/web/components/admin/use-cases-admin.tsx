"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { I } from "@/components/icons";

interface UseCaseRow {
  code: string;
  label: string;
  platform: string | null;
  targetWidth: number;
  targetHeight: number;
  aspectRatio: string;
  icon: string | null;
  sortOrder: number;
  status: "active" | "paused" | "deprecated";
}

interface FormState {
  code: string;
  label: string;
  platform: string;
  targetWidth: number;
  targetHeight: number;
  aspectRatio: string;
  icon: string;
  sortOrder: number;
  status: UseCaseRow["status"];
}

const emptyForm: FormState = {
  code: "",
  label: "",
  platform: "",
  targetWidth: 1080,
  targetHeight: 1080,
  aspectRatio: "1:1",
  icon: "",
  sortOrder: 0,
  status: "active",
};

export function UseCasesAdmin({ rows }: { rows: UseCaseRow[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/use-cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          label: form.label,
          platform: form.platform || undefined,
          targetWidth: Number(form.targetWidth),
          targetHeight: Number(form.targetHeight),
          aspectRatio: form.aspectRatio,
          icon: form.icon || undefined,
          sortOrder: Number(form.sortOrder) || 0,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? `Request failed: ${res.status}`);
        return;
      }
      setShowCreate(false);
      setForm(emptyForm);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove(code: string) {
    if (!confirm(`Delete use case "${code}"?`)) return;
    const res = await fetch(`/api/admin/use-cases/${code}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      alert(json.error ?? `Delete failed: ${res.status}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Use cases</h1>
          <p className="page__sub">
            Marketing surfaces (Instagram Story, Facebook Landscape, …) — the Quick Create wizard&apos;s step 1.
          </p>
        </div>
        <button type="button" className="btn btn--accent" onClick={() => setShowCreate(true)}>
          <I.Plus size={14} />
          New use case
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--cal-gray-50)" }}>
              {["", "Code", "Label", "Platform", "Target W×H", "Aspect", "Status", "Sort", ""].map((h, i) => (
                <th
                  key={h || `col${i}`}
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
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ padding: 24, textAlign: "center", color: "var(--fg-3)" }}
                >
                  No use cases yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.code} style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                  <td style={{ padding: "10px 16px", width: 32, fontSize: 18 }}>{row.icon ?? ""}</td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                    }}
                  >
                    {row.code}
                  </td>
                  <td style={{ padding: "10px 16px" }}>{row.label}</td>
                  <td style={{ padding: "10px 16px", color: "var(--fg-3)" }}>
                    {row.platform ?? "—"}
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)" }}>
                    {row.targetWidth}×{row.targetHeight}
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)" }}>
                    {row.aspectRatio}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span
                      className={`pill pill--${row.status === "active" ? "green" : "ring"}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>{row.sortOrder}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => void remove(row.code)}
                    >
                      <I.Trash size={12} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate ? (
        <div
          role="dialog"
          aria-label="Create use case"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
          }}
          onClick={() => setShowCreate(false)}
        >
          <div
            className="card"
            style={{ padding: 24, width: 520, maxWidth: "92vw", background: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
              New use case
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Code</label>
                  <input
                    className="input mono"
                    value={form.code}
                    onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))}
                    placeholder="ig-story"
                  />
                </div>
                <div>
                  <label className="label">Icon (emoji)</label>
                  <input
                    className="input"
                    value={form.icon}
                    onChange={(e) => setForm((c) => ({ ...c, icon: e.target.value }))}
                    placeholder="🟪"
                  />
                </div>
              </div>
              <div>
                <label className="label">Label</label>
                <input
                  className="input"
                  value={form.label}
                  onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))}
                  placeholder="Instagram Story"
                />
              </div>
              <div>
                <label className="label">Platform</label>
                <input
                  className="input"
                  value={form.platform}
                  onChange={(e) => setForm((c) => ({ ...c, platform: e.target.value }))}
                  placeholder="instagram"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Target width</label>
                  <input
                    className="input"
                    type="number"
                    value={form.targetWidth}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, targetWidth: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Target height</label>
                  <input
                    className="input"
                    type="number"
                    value={form.targetHeight}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, targetHeight: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Aspect ratio</label>
                  <input
                    className="input mono"
                    value={form.aspectRatio}
                    onChange={(e) => setForm((c) => ({ ...c, aspectRatio: e.target.value }))}
                    placeholder="9:16"
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Status</label>
                  <select
                    className="select"
                    value={form.status}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, status: e.target.value as UseCaseRow["status"] }))
                    }
                  >
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="deprecated">deprecated</option>
                  </select>
                </div>
                <div>
                  <label className="label">Sort order</label>
                  <input
                    className="input"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, sortOrder: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
              {error ? (
                <div style={{ color: "var(--studio-red, #c00)", fontSize: 12 }}>{error}</div>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setShowCreate(false);
                  setForm(emptyForm);
                  setError(null);
                }}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--accent"
                onClick={() => void submit()}
                disabled={pending || !form.code || !form.label || !form.aspectRatio}
              >
                {pending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
