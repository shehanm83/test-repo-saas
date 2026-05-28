"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";
import {
  AdminAlert,
  AdminEmpty,
  AdminPage,
  AdminSection,
  AdminStat,
  AdminStatGrid,
  formatAdminNumber,
} from "@/components/admin/ui";

type Category = "food-dietary" | "food-safety" | "cosmetics" | "manufacturing" | "wellness";

const CATEGORIES: Array<{ key: Category | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "food-dietary", label: "Food · Dietary" },
  { key: "food-safety", label: "Food · Safety" },
  { key: "cosmetics", label: "Cosmetics" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "wellness", label: "Wellness" },
];

type StockItem = {
  id: string;
  category: string;
  kind: string;
  label: string;
  tags: string[];
  license: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  url?: string | null;
};

export function StockAdmin(props: { items: StockItem[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Upload form state
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadCategory, setUploadCategory] = useState<Category>("food-dietary");
  const [uploadTags, setUploadTags] = useState("");

  // Edit form state
  const [editLabel, setEditLabel] = useState("");
  const [editCategory, setEditCategory] = useState<Category>("food-dietary");
  const [editTags, setEditTags] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return props.items.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch =
        !q ||
        item.label.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [props.items, activeCategory, search]);

  const photos = props.items.filter((item) => item.kind === "photo").length;
  const icons = props.items.filter((item) => item.kind === "icon").length;
  const tagged = props.items.filter((item) => item.tags.length > 0).length;

  function startEdit(item: StockItem) {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditCategory(item.category as Category);
    setEditTags(item.tags.join(", "));
  }

  async function upload(files: FileList) {
    if (!uploadLabel && files.length === 1) {
      setMessage({ ok: false, text: "Enter a label before uploading." });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      Array.from(files).forEach((file) => body.append("files", file));
      body.append("label", uploadLabel || files[0]!.name.replace(/\.[^.]+$/, ""));
      body.append("category", uploadCategory);
      body.append("tags", JSON.stringify(uploadTags.split(",").map((t) => t.trim()).filter(Boolean)));
      body.append("license", "internal");
      const res = await fetch("/api/admin/stock", { method: "POST", body });
      if (!res.ok) {
        setMessage({ ok: false, text: await res.text() });
        return;
      }
      setMessage({ ok: true, text: `${files.length} asset${files.length > 1 ? "s" : ""} uploaded.` });
      setUploadLabel("");
      setUploadTags("");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/admin/stock/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ ok: false, text: "Delete failed." });
      return;
    }
    setMessage({ ok: true, text: "Asset deleted." });
    router.refresh();
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/stock/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: editLabel,
          category: editCategory,
          tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        setMessage({ ok: false, text: "Save failed." });
        return;
      }
      setEditingId(null);
      setMessage({ ok: true, text: "Asset updated." });
      router.refresh();
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <AdminPage
      eyebrow={
        <>
          <I.Image size={12} />
          Content
        </>
      }
      title="Stock Library"
      description="Upload, tag, and curate certification marks used as reference inputs during generation."
    >
      <AdminStatGrid>
        <AdminStat
          label="Assets"
          value={formatAdminNumber(props.items.length)}
          detail="Total curated stock"
          icon={<I.Image size={14} />}
        />
        <AdminStat
          label="Icons"
          value={formatAdminNumber(icons)}
          detail="Certification marks"
          icon={<I.Square size={14} />}
        />
        <AdminStat
          label="Photos"
          value={formatAdminNumber(photos)}
          detail="Photo references"
          icon={<I.Grid size={14} />}
        />
        <AdminStat
          label="Tagged"
          value={formatAdminNumber(tagged)}
          detail="Searchable assets"
          icon={<I.Tag size={14} />}
          tone={tagged === props.items.length && props.items.length > 0 ? "success" : "warning"}
        />
      </AdminStatGrid>

      {message ? (
        <AdminAlert tone={message.ok ? "success" : "danger"}>{message.text}</AdminAlert>
      ) : null}

      {/* Upload form */}
      <AdminSection title="Upload Assets">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <label>
            <span className="label">Label</span>
            <input
              className="input"
              value={uploadLabel}
              onChange={(e) => setUploadLabel(e.target.value)}
              placeholder="e.g. Gluten Free"
              autoComplete="off"
            />
          </label>
          <label>
            <span className="label">Category</span>
            <select
              className="select"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as Category)}
            >
              {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span className="label">Tags (comma-separated)</span>
            <input
              className="input"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              placeholder="e.g. gluten free, wheat free, celiac"
              autoComplete="off"
            />
          </label>
        </div>
        <label className="btn btn--accent" style={{ cursor: "pointer", width: "max-content" }}>
          <I.Upload size={14} />
          {uploading ? "Uploading…" : "Choose Files"}
          <input
            hidden
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) void upload(e.target.files);
            }}
          />
        </label>
        <div className="hint" style={{ marginTop: 8 }}>
          Multi-file uploads share the category and tags. Labels auto-derive from filename; set label above to override for single uploads.
        </div>
      </AdminSection>

      {props.items.length === 0 ? (
        <AdminEmpty icon={<I.Image size={28} />} title="No Stock Assets Yet">
          Upload PNG, JPEG, WebP, or SVG assets to seed the library.
        </AdminEmpty>
      ) : (
        <AdminSection title="Assets" flush>
          {/* Tabs + search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "0 6px",
              flexWrap: "wrap",
            }}
          >
            <div className="tabs">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`tab${activeCategory === c.key ? " is-active" : ""}`}
                  onClick={() => setActiveCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <I.Search size={13} style={{ position: "absolute", left: 10, top: 10, color: "var(--fg-3)" }} />
              <input
                className="input"
                style={{ paddingLeft: 32, width: 220, fontSize: 13 }}
                placeholder="Search icons…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              No assets match.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
                padding: 16,
              }}
            >
              {filtered.map((item) => (
                <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {/* Thumbnail */}
                  <div
                    style={{
                      aspectRatio: "1/1",
                      background: "var(--cal-gray-100)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div
                        className="checker"
                        style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}
                      >
                        <I.Image size={20} style={{ color: "var(--fg-3)" }} />
                      </div>
                    )}
                    {/* Delete button */}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        padding: "4px 6px",
                        minHeight: "unset",
                      }}
                      aria-label={`Delete ${item.label}`}
                      onClick={() => void deleteItem(item.id)}
                    >
                      <I.Trash size={12} />
                    </button>
                  </div>

                  {/* Info / edit toggle */}
                  {editingId === item.id ? (
                    <div style={{ padding: "10px 12px", display: "grid", gap: 8 }}>
                      <input
                        className="input"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Label"
                        style={{ fontSize: 12 }}
                      />
                      <select
                        className="select"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as Category)}
                        style={{ fontSize: 12 }}
                      >
                        {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        className="input"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="tag1, tag2…"
                        style={{ fontSize: 12 }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={editSaving}
                          onClick={() => void saveEdit(item.id)}
                          style={{ flex: 1 }}
                        >
                          {editSaving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px 12px",
                        textAlign: "left",
                        background: "none",
                        border: 0,
                        cursor: "pointer",
                      }}
                      onClick={() => startEdit(item)}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>
                        {CATEGORIES.find((c) => c.key === item.category)?.label ?? item.category}
                      </div>
                      {item.tags.length > 0 ? (
                        <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 4 }}>
                          {item.tags.slice(0, 3).join(", ")}
                          {item.tags.length > 3 ? ` +${item.tags.length - 3}` : ""}
                        </div>
                      ) : null}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      )}
    </AdminPage>
  );
}
