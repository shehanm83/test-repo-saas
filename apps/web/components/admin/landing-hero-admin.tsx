"use client";

import React, { useState } from "react";

import { I } from "@/components/icons";

interface Row {
  id: string;
  s3Key: string;
  previewUrl: string;
  headline: string;
  sub: string;
  textPosition: "top" | "bottom";
  textColor: "white" | "dark";
  brandInitials: string;
  brandColor: string;
  brandTextColor: string;
  badgeText: string | null;
  badgeBg: string | null;
  badgeColor: string | null;
  rotation: number;
  sortOrder: number;
  status: "draft" | "published";
}

interface FormState {
  headline: string;
  sub: string;
  textPosition: "top" | "bottom";
  textColor: "white" | "dark";
  brandInitials: string;
  brandColor: string;
  brandTextColor: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  rotation: number;
  sortOrder: number;
  status: "draft" | "published";
}

const DEFAULTS: FormState = {
  headline: "Celebrate\nthe season",
  sub: "Cozy moments,\nwarm memories",
  textPosition: "bottom",
  textColor: "white",
  brandInitials: "NW",
  brandColor: "#FFFFFF",
  brandTextColor: "#2A1F18",
  badgeText: "",
  badgeBg: "#7A4023",
  badgeColor: "#FBE5C2",
  rotation: 0,
  sortOrder: 0,
  status: "published",
};

export function LandingHeroAdmin({ rows }: { rows: Row[] }) {
  const [form, setForm] = useState(DEFAULTS);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) {
      alert("Pick an image first.");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    for (const [k, v] of Object.entries(form)) {
      if (v === null || v === undefined) continue;
      fd.append(k, String(v));
    }
    const res = await fetch("/api/admin/landing-hero", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Upload failed: ${JSON.stringify(j)}`);
      return;
    }
    location.reload();
  }

  async function toggleStatus(row: Row) {
    const next = row.status === "published" ? "draft" : "published";
    await fetch(`/api/admin/landing-hero/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    location.reload();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete "${row.headline.split("\n")[0]}"?`)) return;
    await fetch(`/api/admin/landing-hero/${row.id}`, { method: "DELETE" });
    location.reload();
  }

  const publishedCount = rows.filter((r) => r.status === "published").length;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Landing hero</h1>
          <p className="page__sub">
            Pool of cards for the homepage hero. Each refresh picks 4 randomly from
            published cards.
          </p>
        </div>
        <div
          className="pill pill--ring"
          style={{ height: 30, paddingLeft: 12, paddingRight: 12, gap: 6 }}
        >
          <I.Layout size={12} />
          <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>{publishedCount}</span>
          <span style={{ color: "var(--fg-3)" }}>published</span>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h2 className="t-h4" style={{ margin: "0 0 16px" }}>
          Add card
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <label className="label">Image (jpg / png / webp, ≤10MB)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="select"
              value={form.status}
              onChange={(e) =>
                setForm((c) => ({ ...c, status: e.target.value as "draft" | "published" }))
              }
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </div>
          <div>
            <label className="label">Headline (use \n for line breaks)</label>
            <textarea
              className="input"
              rows={2}
              value={form.headline}
              onChange={(e) => setForm((c) => ({ ...c, headline: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Sub (use \n for line breaks)</label>
            <textarea
              className="input"
              rows={2}
              value={form.sub}
              onChange={(e) => setForm((c) => ({ ...c, sub: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Text position</label>
            <select
              className="select"
              value={form.textPosition}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  textPosition: e.target.value as "top" | "bottom",
                }))
              }
            >
              <option value="top">top</option>
              <option value="bottom">bottom</option>
            </select>
          </div>
          <div>
            <label className="label">Text color</label>
            <select
              className="select"
              value={form.textColor}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  textColor: e.target.value as "white" | "dark",
                }))
              }
            >
              <option value="white">white</option>
              <option value="dark">dark</option>
            </select>
          </div>
          <div>
            <label className="label">Brand initials</label>
            <input
              className="input"
              value={form.brandInitials}
              onChange={(e) =>
                setForm((c) => ({ ...c, brandInitials: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Brand badge bg / text color</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                value={form.brandColor}
                onChange={(e) =>
                  setForm((c) => ({ ...c, brandColor: e.target.value }))
                }
              />
              <input
                className="input"
                value={form.brandTextColor}
                onChange={(e) =>
                  setForm((c) => ({ ...c, brandTextColor: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Badge text (optional, e.g. 30%\nOFF)</label>
            <input
              className="input"
              value={form.badgeText}
              onChange={(e) => setForm((c) => ({ ...c, badgeText: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Badge bg / text color</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                value={form.badgeBg}
                onChange={(e) => setForm((c) => ({ ...c, badgeBg: e.target.value }))}
              />
              <input
                className="input"
                value={form.badgeColor}
                onChange={(e) =>
                  setForm((c) => ({ ...c, badgeColor: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Rotation (-10 to 10 deg)</label>
            <input
              className="input"
              type="number"
              value={form.rotation}
              onChange={(e) =>
                setForm((c) => ({ ...c, rotation: Number(e.target.value) }))
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
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void submit()}
          disabled={busy}
        >
          <I.Plus size={14} />
          {busy ? "Uploading…" : "Add card"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {rows.map((row) => (
          <div
            key={row.id}
            className="card"
            style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div
              style={{
                position: "relative",
                aspectRatio: "4 / 5",
                borderRadius: 12,
                overflow: "hidden",
                background: "var(--cal-gray-100)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.previewUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 600,
                  background:
                    row.status === "published" ? "var(--layertone-violet)" : "#aaa",
                  color: "white",
                }}
              >
                {row.status}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "pre-line" }}>
              {row.headline}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-3)",
                whiteSpace: "pre-line",
              }}
            >
              {row.sub}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ height: 28, fontSize: 12, flex: 1 }}
                onClick={() => void toggleStatus(row)}
              >
                {row.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ height: 28, fontSize: 12 }}
                onClick={() => void remove(row)}
                title="Delete"
              >
                <I.Trash size={12} />
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="t-small" style={{ color: "var(--fg-3)" }}>
            No cards yet. Add 4-8 to fill the homepage hero pool.
          </p>
        ) : null}
      </div>
    </div>
  );
}
