"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";

import type { BucketGroup, ModelRow, RoutingRow } from "./routing-admin";

export function RoutingBucketPanel({
  bucket,
  allModels,
  onClose,
}: {
  bucket: BucketGroup;
  allModels: ModelRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [modelToAdd, setModelToAdd] = useState<string>("");

  const rowsSorted = useMemo(
    () => [...bucket.rows].sort((a, b) => a.sortOrder - b.sortOrder),
    [bucket.rows],
  );

  const eligibleCodes = new Set(rowsSorted.map((r) => r.modelCode));
  const addableModels = allModels.filter(
    (m) => m.status === "active" && !eligibleCodes.has(m.code),
  );

  function modelDisplay(code: string) {
    return allModels.find((m) => m.code === code)?.displayName ?? code;
  }

  async function setDefault(row: RoutingRow) {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/taxonomy/routing/${row.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        alert(json.error ?? `Failed: ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function reorder(row: RoutingRow, direction: -1 | 1) {
    const newOrder = row.sortOrder + direction;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/taxonomy/routing/${row.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: newOrder }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        alert(json.error ?? `Failed: ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove(row: RoutingRow) {
    if (!confirm(`Remove ${modelDisplay(row.modelCode)} from this bucket?`)) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/taxonomy/routing/${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        alert(json.error ?? `Failed: ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function addModel() {
    if (!modelToAdd) return;
    setPending(true);
    try {
      const nextSortOrder =
        rowsSorted.length === 0
          ? 0
          : Math.max(...rowsSorted.map((r) => r.sortOrder)) + 1;
      const res = await fetch("/api/admin/taxonomy/routing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tierCode: bucket.tierCode,
          strengthCode: bucket.strengthCode,
          modelCode: modelToAdd,
          isDefault: false,
          sortOrder: nextSortOrder,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        alert(json.error ?? `Failed: ${res.status}`);
        return;
      }
      setModelToAdd("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label={`Edit routing bucket ${bucket.label}`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          width: 480,
          maxWidth: "90vw",
          height: "100%",
          padding: 24,
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h2 className="t-h3" style={{ margin: 0 }}>
              {bucket.label}
            </h2>
            <p className="t-small mono" style={{ marginTop: 4 }}>
              tier: {bucket.tierCode}
              {bucket.strengthCode ? ` · strength: ${bucket.strengthCode}` : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close panel"
            className="btn btn--secondary btn--sm"
            onClick={onClose}
          >
            <I.X size={12} />
          </button>
        </div>

        <h3 className="t-h4" style={{ margin: "0 0 12px" }}>
          Eligible models
        </h3>
        {rowsSorted.length === 0 ? (
          <p style={{ color: "var(--fg-3)", fontSize: 13 }}>
            No models in this bucket yet.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {rowsSorted.map((row, idx) => (
              <li
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--cal-gray-200)",
                }}
              >
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <input
                    type="radio"
                    name={`default-${bucket.tierCode}-${bucket.strengthCode ?? "null"}`}
                    checked={row.isDefault}
                    disabled={pending}
                    onChange={() => void setDefault(row)}
                  />
                  Default
                </label>
                <span style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>{modelDisplay(row.modelCode)}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>
                    {row.modelCode} · sort {row.sortOrder}
                    {row.isDefault ? (
                      <span className="pill pill--green" style={{ marginLeft: 6 }}>
                        DEFAULT
                      </span>
                    ) : null}
                  </div>
                </span>
                <span style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    aria-label="Move up"
                    className="btn btn--secondary btn--sm"
                    disabled={pending || idx === 0}
                    onClick={() => void reorder(row, -1)}
                  >
                    <I.ChevronUp size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    className="btn btn--secondary btn--sm"
                    disabled={pending || idx === rowsSorted.length - 1}
                    onClick={() => void reorder(row, 1)}
                  >
                    <I.ChevronDown size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove model"
                    className="btn btn--secondary btn--sm"
                    disabled={pending}
                    onClick={() => void remove(row)}
                  >
                    <I.Trash size={12} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="t-h4" style={{ margin: "20px 0 12px" }}>
          Add a model
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            className="select"
            value={modelToAdd}
            onChange={(e) => setModelToAdd(e.target.value)}
            aria-label="Model to add"
            style={{ flex: 1 }}
          >
            <option value="">Select a model…</option>
            {addableModels.map((m) => (
              <option key={m.code} value={m.code}>
                {m.displayName} ({m.code})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => void addModel()}
            disabled={pending || !modelToAdd}
          >
            <I.Plus size={12} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
