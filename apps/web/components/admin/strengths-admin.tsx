"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { I } from "@/components/icons";

interface StrengthRow {
  code: string;
  label: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

interface FormState {
  code: string;
  label: string;
  description: string;
  sortOrder: number;
}

const emptyForm: FormState = { code: "", label: "", description: "", sortOrder: 0 };

export function StrengthsAdmin({ rows }: { rows: StrengthRow[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/taxonomy/strengths", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          label: form.label,
          description: form.description || undefined,
          sortOrder: Number(form.sortOrder) || 0,
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
    if (!confirm(`Delete strength "${code}"?`)) return;
    const res = await fetch(`/api/admin/taxonomy/strengths/${code}`, { method: "DELETE" });
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
          <h1 className="page__title">Strengths</h1>
          <p className="page__sub">
            Premium-tier capability buckets (e.g., Photoreal, Text rendering).
          </p>
        </div>
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => setShowCreate(true)}
        >
          <I.Plus size={14} />
          New strength
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--cal-gray-50)" }}>
              {["Code", "Label", "Description", "Sort", ""].map((h) => (
                <th
                  key={h || "actions"}
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
                  colSpan={5}
                  style={{ padding: 24, textAlign: "center", color: "var(--fg-3)" }}
                >
                  No strengths yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.code} style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
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
                    {row.description ?? "—"}
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
          aria-label="Create strength"
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
            style={{ padding: 24, width: 480, maxWidth: "90vw", background: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
              New strength
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">Code</label>
                <input
                  className="input mono"
                  value={form.code}
                  onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))}
                  placeholder="photoreal"
                />
              </div>
              <div>
                <label className="label">Label</label>
                <input
                  className="input"
                  value={form.label}
                  onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))}
                  placeholder="Photoreal"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, description: e.target.value }))
                  }
                />
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
              {error ? (
                <div style={{ color: "var(--studio-red, #c00)", fontSize: 12 }}>
                  {error}
                </div>
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
                disabled={pending || !form.code || !form.label}
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
