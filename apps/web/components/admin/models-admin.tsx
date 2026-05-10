"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";

interface ModelRow {
  code: string;
  displayName: string;
  description: string | null;
  vendor: string;
  llmModelId: string;
  status: "active" | "paused" | "deprecated";
}

interface FormState {
  code: string;
  displayName: string;
  description: string;
  vendor: string;
  llmModelId: string;
  status: "active" | "paused" | "deprecated";
}

const emptyForm: FormState = {
  code: "",
  displayName: "",
  description: "",
  vendor: "",
  llmModelId: "",
  status: "active",
};

export function ModelsAdmin({ rows }: { rows: ModelRow[] }) {
  const router = useRouter();
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [codeFilter, setCodeFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vendors = useMemo(
    () => Array.from(new Set(rows.map((r) => r.vendor))).sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (vendorFilter && r.vendor !== vendorFilter) return false;
        if (statusFilter && r.status !== statusFilter) return false;
        if (codeFilter && !r.code.toLowerCase().includes(codeFilter.toLowerCase())) {
          return false;
        }
        return true;
      }),
    [rows, vendorFilter, statusFilter, codeFilter],
  );

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/taxonomy/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          displayName: form.displayName,
          description: form.description || undefined,
          vendor: form.vendor,
          llmModelId: form.llmModelId,
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

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Models</h1>
          <p className="page__sub">Vendor-backed image generation models.</p>
        </div>
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => setShowCreate(true)}
        >
          <I.Plus size={14} />
          New model
        </button>
      </div>

      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "1fr 200px 200px",
          gap: 12,
        }}
      >
        <div>
          <label className="label">Code contains</label>
          <input
            className="input mono"
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
            placeholder="flux"
            aria-label="Filter by code"
          />
        </div>
        <div>
          <label className="label">Vendor</label>
          <select
            className="select"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            aria-label="Filter by vendor"
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="deprecated">deprecated</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--cal-gray-50)" }}>
              {["Code", "Display name", "Vendor", "LLM model id", "Status", ""].map(
                (h) => (
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
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: 24, textAlign: "center", color: "var(--fg-3)" }}
                >
                  No models match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.code}
                  style={{
                    borderTop: "1px solid var(--cal-gray-200)",
                    cursor: "pointer",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 16px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                    }}
                  >
                    <Link
                      href={`/admin/models/${row.code}`}
                      style={{ color: "var(--fg-1)", textDecoration: "none" }}
                    >
                      {row.code}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Link
                      href={`/admin/models/${row.code}`}
                      style={{ color: "var(--fg-1)", textDecoration: "none", fontWeight: 500 }}
                    >
                      {row.displayName}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 16px" }}>{row.vendor}</td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--fg-3)",
                    }}
                  >
                    {row.llmModelId}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span
                      className="pill"
                      style={{
                        background:
                          row.status === "active"
                            ? "var(--studio-green-bg, #e6f7ee)"
                            : row.status === "paused"
                              ? "var(--studio-amber-bg, #fff4e0)"
                              : "var(--cal-gray-100)",
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <Link
                      href={`/admin/models/${row.code}`}
                      className="btn btn--secondary btn--sm"
                    >
                      Edit
                    </Link>
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
          aria-label="Create model"
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
            style={{ padding: 24, width: 520, maxWidth: "90vw", background: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
              New model
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">Code</label>
                <input
                  className="input mono"
                  value={form.code}
                  onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))}
                  placeholder="flux-1.1-pro"
                />
              </div>
              <div>
                <label className="label">Display name</label>
                <input
                  className="input"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, displayName: e.target.value }))
                  }
                  placeholder="Flux 1.1 Pro"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, description: e.target.value }))
                  }
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Vendor</label>
                  <input
                    className="input"
                    value={form.vendor}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, vendor: e.target.value }))
                    }
                    placeholder="black-forest-labs"
                  />
                </div>
                <div>
                  <label className="label">LLM model id</label>
                  <input
                    className="input mono"
                    value={form.llmModelId}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, llmModelId: e.target.value }))
                    }
                    placeholder="flux-1.1-pro"
                  />
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="select"
                  value={form.status}
                  onChange={(e) =>
                    setForm((c) => ({
                      ...c,
                      status: e.target.value as FormState["status"],
                    }))
                  }
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="deprecated">deprecated</option>
                </select>
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
                disabled={
                  pending ||
                  !form.code ||
                  !form.displayName ||
                  !form.vendor ||
                  !form.llmModelId
                }
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
