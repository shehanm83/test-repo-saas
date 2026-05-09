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

interface StrengthRow {
  code: string;
  label: string;
}
interface TagRow {
  code: string;
  label: string;
}
interface RoutingRow {
  id: string;
  tierCode: string;
  strengthCode: string | null;
  modelCode: string;
  isDefault: boolean;
  sortOrder: number;
}

export function ModelDetail({
  model,
  allStrengths,
  allTags,
  routing,
  assignedStrengths,
  assignedTags,
}: {
  model: ModelRow;
  allStrengths: StrengthRow[];
  allTags: TagRow[];
  routing: RoutingRow[];
  assignedStrengths: string[];
  assignedTags: string[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Basics form
  const [displayName, setDisplayName] = useState(model.displayName);
  const [description, setDescription] = useState(model.description ?? "");
  const [vendor, setVendor] = useState(model.vendor);
  const [llmModelId, setLlmModelId] = useState(model.llmModelId);
  const [status, setStatus] = useState<ModelRow["status"]>(model.status);

  // Strength assignment
  const [strengthToAdd, setStrengthToAdd] = useState<string>("");
  const unassignedStrengths = useMemo(
    () => allStrengths.filter((s) => !assignedStrengths.includes(s.code)),
    [allStrengths, assignedStrengths],
  );

  // Tag assignment (combobox)
  const [tagInput, setTagInput] = useState("");

  // Routing for this model
  const myRouting = useMemo(
    () => routing.filter((r) => r.modelCode === model.code),
    [routing, model.code],
  );

  async function saveBasics() {
    setPending(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/taxonomy/models/${model.code}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName,
          description: description || undefined,
          vendor,
          llmModelId,
          status,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(json.error ?? `Update failed: ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function addStrength() {
    if (!strengthToAdd) return;
    const res = await fetch(`/api/admin/taxonomy/models/${model.code}/strengths`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ strengthCode: strengthToAdd }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      alert(json.error ?? `Failed to assign strength: ${res.status}`);
      return;
    }
    setStrengthToAdd("");
    router.refresh();
  }

  async function removeStrength(strengthCode: string) {
    const res = await fetch(`/api/admin/taxonomy/models/${model.code}/strengths`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ strengthCode }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      alert(json.error ?? `Failed to remove strength: ${res.status}`);
      return;
    }
    router.refresh();
  }

  async function addTag() {
    const code = tagInput.trim();
    if (!code) return;
    const exists = allTags.some((t) => t.code === code);
    if (!exists) {
      // create the tag first
      const create = await fetch("/api/admin/taxonomy/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, label: code }),
      });
      if (!create.ok) {
        const json = (await create.json().catch(() => ({}))) as { error?: string };
        alert(json.error ?? `Failed to create tag: ${create.status}`);
        return;
      }
    }
    const res = await fetch(`/api/admin/taxonomy/models/${model.code}/tags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tagCode: code }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      alert(json.error ?? `Failed to assign tag: ${res.status}`);
      return;
    }
    setTagInput("");
    router.refresh();
  }

  async function removeTag(tagCode: string) {
    const res = await fetch(`/api/admin/taxonomy/models/${model.code}/tags`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tagCode }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      alert(json.error ?? `Failed to remove tag: ${res.status}`);
      return;
    }
    router.refresh();
  }

  async function deleteModel() {
    if (!confirm(`Delete model "${model.code}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/taxonomy/models/${model.code}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      alert(json.error ?? `Delete failed: ${res.status}`);
      return;
    }
    router.push("/admin/models");
  }

  const strengthLabel = (code: string) =>
    allStrengths.find((s) => s.code === code)?.label ?? code;
  const tagLabel = (code: string) => allTags.find((t) => t.code === code)?.label ?? code;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <Link
            href="/admin/models"
            style={{ fontSize: 12, color: "var(--fg-3)", textDecoration: "none" }}
          >
            <I.ArrowLeft size={11} /> Models
          </Link>
          <h1 className="page__title" style={{ marginTop: 4 }}>
            {model.displayName}
          </h1>
          <p className="page__sub mono">{model.code}</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Basics */}
        <div className="card" style={{ padding: 24 }}>
          <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
            Basics
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label className="label">Display name</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Vendor</label>
              <input
                className="input"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
            </div>
            <div>
              <label className="label">LLM model id</label>
              <input
                className="input mono"
                value={llmModelId}
                onChange={(e) => setLlmModelId(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value as ModelRow["status"])}
              >
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="deprecated">deprecated</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {errorMsg ? (
            <div
              style={{ color: "var(--studio-red, #c00)", fontSize: 12, marginTop: 8 }}
            >
              {errorMsg}
            </div>
          ) : null}
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => void saveBasics()}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* Strengths */}
        <div className="card" style={{ padding: 24 }}>
          <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
            Strengths
          </h2>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
              minHeight: 28,
            }}
          >
            {assignedStrengths.length === 0 ? (
              <span style={{ color: "var(--fg-3)", fontSize: 13 }}>None assigned.</span>
            ) : (
              assignedStrengths.map((s) => (
                <span key={s} className="pill pill--ring" style={{ height: 22 }}>
                  {strengthLabel(s)}
                  <button
                    type="button"
                    aria-label={`Remove strength ${s}`}
                    onClick={() => void removeStrength(s)}
                    style={{
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      padding: 0,
                      marginLeft: 4,
                      display: "inline-flex",
                    }}
                  >
                    <I.X size={10} />
                  </button>
                </span>
              ))
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              className="select"
              value={strengthToAdd}
              onChange={(e) => setStrengthToAdd(e.target.value)}
              aria-label="Add strength"
              style={{ flex: 1 }}
            >
              <option value="">Select a strength…</option>
              {unassignedStrengths.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label} ({s.code})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void addStrength()}
              disabled={!strengthToAdd}
            >
              <I.Plus size={12} />
              Add
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="card" style={{ padding: 24 }}>
          <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
            Tags
          </h2>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
              minHeight: 28,
            }}
          >
            {assignedTags.length === 0 ? (
              <span style={{ color: "var(--fg-3)", fontSize: 13 }}>None assigned.</span>
            ) : (
              assignedTags.map((t) => (
                <span key={t} className="pill pill--ring" style={{ height: 22 }}>
                  {tagLabel(t)}
                  <button
                    type="button"
                    aria-label={`Remove tag ${t}`}
                    onClick={() => void removeTag(t)}
                    style={{
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      padding: 0,
                      marginLeft: 4,
                      display: "inline-flex",
                    }}
                  >
                    <I.X size={10} />
                  </button>
                </span>
              ))
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              list="all-tags"
              className="input mono"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="tag-code"
              aria-label="Add tag"
              style={{ flex: 1 }}
            />
            <datalist id="all-tags">
              {allTags.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </datalist>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void addTag()}
              disabled={!tagInput.trim()}
            >
              <I.Plus size={12} />
              Add
            </button>
          </div>
        </div>

        {/* Routing (read-only) */}
        <div className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2 className="t-h4" style={{ margin: 0 }}>
              Routing
            </h2>
            <Link href="/admin/routing" className="btn btn--secondary btn--sm">
              Edit routing
            </Link>
          </div>
          {myRouting.length === 0 ? (
            <p style={{ color: "var(--fg-3)", fontSize: 13, margin: 0 }}>
              This model is not in any routing bucket.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {myRouting.map((r) => (
                <li
                  key={r.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid var(--cal-gray-200)",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <span className="mono" style={{ fontSize: 13 }}>
                    {r.tierCode}
                    {r.strengthCode ? ` · ${r.strengthCode}` : ""}
                  </span>
                  {r.isDefault ? <span className="pill pill--green">Default</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Danger zone */}
        <div
          className="card"
          style={{ padding: 24, borderColor: "var(--studio-red, #c00)" }}
        >
          <h2 className="t-h4" style={{ margin: "0 0 8px" }}>
            Danger zone
          </h2>
          <p style={{ color: "var(--fg-3)", fontSize: 13, margin: "0 0 16px" }}>
            Deleting a model is permanent and removes all assignments and routing.
          </p>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void deleteModel()}
          >
            <I.Trash size={12} />
            Delete model
          </button>
        </div>
      </div>
    </div>
  );
}
