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
  allowCustomSize?: boolean;
}

interface SupportedSize {
  width: number;
  height: number;
  label: string | null;
  sortOrder: number;
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

interface PricingRow {
  sizeBucket: "standard" | "large";
  hasInspirationFlag: boolean;
  credits: number;
  version: number;
}

const PRICING_CELLS: Array<{
  sizeBucket: "standard" | "large";
  hasInspirationFlag: boolean;
  label: string;
  hint: string;
}> = [
  { sizeBucket: "standard", hasInspirationFlag: false, label: "Standard size", hint: "≤ 1280×1280" },
  { sizeBucket: "standard", hasInspirationFlag: true, label: "Standard + inspiration", hint: "≤ 1280×1280, with reference image" },
  { sizeBucket: "large", hasInspirationFlag: false, label: "Large size", hint: "> 1280×1280" },
  { sizeBucket: "large", hasInspirationFlag: true, label: "Large + inspiration", hint: "> 1280×1280, with reference image" },
];

export function ModelDetail({
  model,
  allStrengths,
  allTags,
  routing,
  assignedStrengths,
  assignedTags,
  supportedSizes = [],
  pricing = [],
}: {
  model: ModelRow;
  allStrengths: StrengthRow[];
  allTags: TagRow[];
  routing: RoutingRow[];
  assignedStrengths: string[];
  assignedTags: string[];
  supportedSizes?: SupportedSize[];
  pricing?: PricingRow[];
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
    // Vendor / llm_model_id changes re-point production traffic. Confirm if
    // either has been edited from the value the page rendered with.
    const mappingChanged = vendor !== model.vendor || llmModelId !== model.llmModelId;
    if (mappingChanged) {
      const ok = window.confirm(
        `You're changing the vendor mapping for "${model.code}":\n` +
          `\n  ${model.vendor} / ${model.llmModelId}\n  →  ${vendor} / ${llmModelId}\n\n` +
          `This re-points production generation traffic for any active routing. ` +
          `Make sure a provider class exists that handles "${vendor}".`,
      );
      if (!ok) return;
    }
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

        {/* Credits — sub-project D2 of the admin UX redesign. Inline editable
            grid; mutation hits PUT /api/admin/pricebook/credits which expires
            the active row and inserts a new versioned one. */}
        <PricingCard modelCode={model.code} initial={pricing} />

        {/* Used in (was Routing — same data, friendlier framing + inline swap) */}
        <UsedInCard modelCode={model.code} routing={myRouting} />

        {/* Supported sizes (read-only — seeded by migration) */}
        <div className="card" style={{ padding: 24 }}>
          <h2 className="t-h4" style={{ margin: "0 0 8px" }}>
            Supported sizes
          </h2>
          <p style={{ color: "var(--fg-3)", fontSize: 13, margin: "0 0 16px" }}>
            {model.allowCustomSize
              ? "This model accepts custom resolutions. Listed sizes are recommended presets."
              : "Selectable resolutions for this model."}
          </p>
          {supportedSizes.length === 0 ? (
            <p style={{ color: "var(--fg-3)", fontSize: 13, margin: 0 }}>
              No sizes seeded. Add via migration.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {supportedSizes.map((s) => (
                <li
                  key={`${s.width}x${s.height}`}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid var(--cal-gray-200)",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <span className="mono" style={{ fontSize: 13 }}>
                    {s.width} × {s.height}
                  </span>
                  {s.label ? (
                    <span style={{ color: "var(--fg-3)", fontSize: 13 }}>{s.label}</span>
                  ) : null}
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

// ── Credits ────────────────────────────────────────────────────────────────

function PricingCard({
  modelCode,
  initial,
}: {
  modelCode: string;
  initial: PricingRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PricingRow[]>(initial);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cellKey = (sb: "standard" | "large", insp: boolean) => `${sb}|${insp}`;

  function find(sb: "standard" | "large", insp: boolean) {
    return rows.find((r) => r.sizeBucket === sb && r.hasInspirationFlag === insp) ?? null;
  }

  async function save(sb: "standard" | "large", insp: boolean) {
    const key = cellKey(sb, insp);
    const raw = draft[key];
    if (raw == null) return;
    const credits = Number(raw);
    if (!Number.isInteger(credits) || credits < 1 || credits > 1000) {
      setError("Credits must be an integer 1–1000.");
      return;
    }
    setPendingKey(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/pricebook/credits", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ modelCode, sizeBucket: sb, hasInspirationFlag: insp, credits }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? `Save failed: ${res.status}`);
        return;
      }
      const inserted = (await res.json()) as PricingRow;
      setRows((prev) => [
        ...prev.filter((r) => !(r.sizeBucket === sb && r.hasInspirationFlag === insp)),
        inserted,
      ]);
      setDraft((d) => {
        const { [key]: _drop, ...rest } = d;
        void _drop;
        return rest;
      });
      router.refresh();
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 className="t-h4" style={{ margin: "0 0 8px" }}>
        Credit cost
      </h2>
      <p style={{ color: "var(--fg-3)", fontSize: 13, margin: "0 0 16px" }}>
        How many credits this model charges per generation. Set per size bucket
        and per "has reference image" flag. Each save creates a new versioned
        row in the price book; old versions stay for audit.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--cal-gray-50)" }}>
            {["Bucket", "Threshold", "Credits", "Version", ""].map((h, i) => (
              <th
                key={h || i}
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
          {PRICING_CELLS.map((cell) => {
            const key = cellKey(cell.sizeBucket, cell.hasInspirationFlag);
            const row = find(cell.sizeBucket, cell.hasInspirationFlag);
            const value = draft[key] ?? (row ? String(row.credits) : "");
            const dirty = draft[key] != null && draft[key] !== String(row?.credits ?? "");
            return (
              <tr
                key={key}
                style={{ borderTop: "1px solid var(--cal-gray-200)" }}
              >
                <td style={{ padding: "10px 16px" }}>{cell.label}</td>
                <td style={{ padding: "10px 16px", color: "var(--fg-3)" }}>{cell.hint}</td>
                <td style={{ padding: "10px 16px" }}>
                  <input
                    className="input mono"
                    style={{ width: 90 }}
                    type="number"
                    min={1}
                    max={1000}
                    value={value}
                    placeholder={row ? "" : "—"}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [key]: e.target.value }))
                    }
                  />
                </td>
                <td style={{ padding: "10px 16px", color: "var(--fg-3)" }}>
                  {row ? `v${row.version}` : "—"}
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={!dirty || pendingKey === key}
                    onClick={() => void save(cell.sizeBucket, cell.hasInspirationFlag)}
                  >
                    {pendingKey === key ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {error ? (
        <p style={{ color: "var(--studio-red, #c00)", fontSize: 12, marginTop: 12 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ── Used in (routing) ──────────────────────────────────────────────────────

function UsedInCard({
  modelCode,
  routing,
}: {
  modelCode: string;
  routing: RoutingRow[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function makeDefault(routingId: string) {
    setPendingId(routingId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/taxonomy/routing/${routingId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? `Update failed: ${res.status}`);
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h2 className="t-h4" style={{ margin: 0 }}>
          Used in
        </h2>
        <span className="mono" style={{ color: "var(--fg-3)", fontSize: 12 }}>
          {modelCode}
        </span>
      </div>
      <p style={{ color: "var(--fg-3)", fontSize: 13, margin: "0 0 16px" }}>
        Tier / strength buckets where this model is wired. Click "Make default"
        to flip the active default for that bucket — production traffic will
        re-route immediately.
      </p>
      {routing.length === 0 ? (
        <p style={{ color: "var(--fg-3)", fontSize: 13, margin: 0 }}>
          This model is not in any routing bucket. Add it via{" "}
          <Link href="/admin/routing" style={{ textDecoration: "underline" }}>
            /admin/routing
          </Link>
          .
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {routing.map((r) => (
            <li
              key={r.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--cal-gray-200)",
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <span className="mono" style={{ fontSize: 13, minWidth: 180 }}>
                {r.tierCode}
                {r.strengthCode ? ` · ${r.strengthCode}` : ""}
              </span>
              {r.isDefault ? (
                <span className="pill pill--green">Default</span>
              ) : (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={pendingId === r.id}
                  onClick={() => void makeDefault(r.id)}
                >
                  {pendingId === r.id ? "Updating…" : "Make default"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p style={{ color: "var(--studio-red, #c00)", fontSize: 12, marginTop: 12 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
