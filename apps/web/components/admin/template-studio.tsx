"use client";

import React, { useState } from "react";

import { I } from "@/components/icons";
import { AdminAlert, AdminEmpty, AdminSection, AdminStatus } from "@/components/admin/ui";

const TEMPLATE_MODELS = [
  "flux-1.1-pro",
  "gpt-image-2",
  "gpt-image-1",
  "recraft-v3",
  "bedrock-sd35",
  "nova-canvas",
] as const;
const TEMPLATE_ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9", "1.91:1", "2:3"] as const;

export function TemplateStudio(props: {
  templates: Array<{
    id: string;
    slug: string;
    name: string;
    status: string;
    preferredModel: string;
    jsxSource: string;
    supportedAspectRatios: string[];
    requiresBrowserRender: boolean;
    family: string;
    layout: string;
    rendererCompatibility: string;
  }>;
}) {
  const [selectedId, setSelectedId] = useState(props.templates[0]?.id ?? "");
  const selected = props.templates.find((t) => t.id === selectedId) ?? null;
  const [jsx, setJsx] = useState(selected?.jsxSource ?? "");
  const [savedJsx, setSavedJsx] = useState(selected?.jsxSource ?? "");
  const [previewBrandName, setPreviewBrandName] = useState("Brand");
  const [previewPrimary, setPreviewPrimary] = useState("#5E5CE6");
  const [previewKey, setPreviewKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = useState(selected?.status ?? "draft");
  const [preferredModel, setPreferredModel] = useState(selected?.preferredModel ?? "flux-1.1-pro");
  const [supportedAspectRatios, setSupportedAspectRatios] = useState<string[]>(
    selected?.supportedAspectRatios ?? ["1:1", "4:5"],
  );
  const [family, setFamily] = useState(selected?.family ?? "product_hero");
  const [layout, setLayout] = useState(selected?.layout ?? "centered_product_hero");
  const [rendererCompatibility, setRendererCompatibility] = useState<"satori" | "browser">(
    selected?.rendererCompatibility === "browser" ? "browser" : "satori",
  );
  const [requiresBrowserRender, setRequiresBrowserRender] = useState(
    selected?.requiresBrowserRender ?? false,
  );

  React.useEffect(() => {
    setJsx(selected?.jsxSource ?? "");
    setSavedJsx(selected?.jsxSource ?? "");
    setStatus(selected?.status ?? "draft");
    setPreferredModel(selected?.preferredModel ?? "flux-1.1-pro");
    setSupportedAspectRatios(selected?.supportedAspectRatios ?? ["1:1", "4:5"]);
    setFamily(selected?.family ?? "product_hero");
    setLayout(selected?.layout ?? "centered_product_hero");
    setRendererCompatibility(selected?.rendererCompatibility === "browser" ? "browser" : "satori");
    setRequiresBrowserRender(selected?.requiresBrowserRender ?? false);
    setMessage(null);
  }, [selected?.id, selected]);

  async function patch(body: unknown) {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/templates/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMessage({ ok: false, text: await res.text() });
        return;
      }
      if (typeof body === "object" && body && "jsxSource" in body) {
        setSavedJsx(String((body as { jsxSource: unknown }).jsxSource));
      }
      if (typeof body === "object" && body && "status" in body) {
        setStatus(String((body as { status: unknown }).status));
      }
      setMessage({ ok: true, text: "Template source saved." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-split">
      <aside className="admin-split__rail">
        <div className="admin-split__rail-head">
          <div className="admin-eyebrow">
            <I.Layout size={12} /> Template Studio
          </div>
        </div>
        <div className="admin-split__rail-body">
          {props.templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`admin-rail-item${t.id === selectedId ? " is-active" : ""}`}
              style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
            >
              <span style={{ minWidth: 0 }}>
                <span className="admin-rail-item__title">{t.name}</span>
                <span className="admin-rail-item__meta">
                  {t.preferredModel} · {t.slug}
                </span>
              </span>
              <AdminStatus status={t.status} />
            </button>
          ))}
        </div>
      </aside>

      <section className="admin-split__main">
        {selected ? (
          <>
            <div className="admin-editor-header">
              <div>
                <h1>{selected.name}</h1>
                <p className="mono">{selected.slug}</p>
              </div>
              <AdminStatus status={status} />
            </div>
            <div style={{ padding: "18px 18px 0" }}>
              <AdminSection
                title="Routing & Lifecycle"
                description="Quick Create uses these fields when matching family, layout, format, renderer, and provider requirements."
                actions={
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      disabled={saving || status === "archived"}
                      onClick={() => void patch({ status: "archived" })}
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={saving || supportedAspectRatios.length === 0}
                      onClick={() =>
                        void patch({
                          preferredModel,
                          supportedAspectRatios,
                          requiresBrowserRender,
                          family,
                          layout,
                          rendererCompatibility,
                          status: "published",
                        })
                      }
                    >
                      <I.Save size={13} /> Save & Publish
                    </button>
                  </div>
                }
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 14,
                  }}
                >
                  <div>
                    <label className="label">Template family</label>
                    <input
                      className="input mono"
                      value={family}
                      onChange={(event) => setFamily(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Layout</label>
                    <input
                      className="input mono"
                      value={layout}
                      onChange={(event) => setLayout(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Preferred model</label>
                    <select
                      className="select"
                      value={preferredModel}
                      onChange={(event) => setPreferredModel(event.target.value)}
                    >
                      {TEMPLATE_MODELS.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Renderer compatibility</label>
                    <select
                      className="select"
                      value={rendererCompatibility}
                      onChange={(event) =>
                        setRendererCompatibility(event.target.value as "satori" | "browser")
                      }
                    >
                      <option value="satori">Satori</option>
                      <option value="browser">Browser</option>
                    </select>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
                    <input
                      type="checkbox"
                      checked={requiresBrowserRender}
                      onChange={(event) => setRequiresBrowserRender(event.target.checked)}
                    />
                    Requires browser render
                  </label>
                </div>
                <label className="label" style={{ marginTop: 16 }}>
                  Supported aspect ratios
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {TEMPLATE_ASPECT_RATIOS.map((ratio) => {
                    const checked = supportedAspectRatios.includes(ratio);
                    return (
                      <label key={ratio} className="pill">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSupportedAspectRatios((current) =>
                              checked
                                ? current.filter((item) => item !== ratio)
                                : [...current, ratio],
                            )
                          }
                        />
                        {ratio}
                      </label>
                    );
                  })}
                </div>
              </AdminSection>
            </div>
            <div className="admin-editor-body admin-editor-body--split">
              <div style={{ position: "sticky", top: 18 }}>
                <AdminSection
                  title="Preview"
                  description="Render the template with a synthetic brand before publishing changes."
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 12,
                      alignItems: "flex-end",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <label className="label" htmlFor="template-preview-brand">
                        Brand Name
                      </label>
                      <input
                        id="template-preview-brand"
                        className="input"
                        name="brandName"
                        autoComplete="off"
                        value={previewBrandName}
                        onChange={(e) => setPreviewBrandName(e.target.value)}
                        style={{ width: 180 }}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="template-preview-primary">
                        Primary Color
                      </label>
                      <input
                        id="template-preview-primary"
                        type="color"
                        name="primaryColor"
                        value={previewPrimary}
                        onChange={(e) => setPreviewPrimary(e.target.value)}
                        style={{
                          width: 48,
                          height: 36,
                          padding: 2,
                          cursor: "pointer",
                          border: "1px solid var(--cal-gray-200)",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => setPreviewKey((k) => k + 1)}
                    >
                      <I.Refresh size={13} /> Refresh
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={previewKey}
                    src={`/api/admin/templates/${selected.id}/preview?brandName=${encodeURIComponent(previewBrandName)}&primary=${encodeURIComponent(previewPrimary)}`}
                    alt="Template preview"
                    style={{
                      width: "min(520px, 100%)",
                      borderRadius: 8,
                      boxShadow: "var(--shadow-ring)",
                      display: "block",
                    }}
                  />
                </AdminSection>
              </div>
              <AdminSection
                title="JSX Source"
                description="Edit the template source, then save explicitly before refreshing the preview."
                actions={
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => void patch({ jsxSource: jsx })}
                    disabled={saving || jsx === savedJsx}
                  >
                    <I.Save size={13} />
                    {saving ? "Saving…" : "Save Source"}
                  </button>
                }
              >
                {message ? (
                  <AdminAlert tone={message.ok ? "success" : "danger"}>{message.text}</AdminAlert>
                ) : null}
                <label className="label" htmlFor="template-jsx-source">
                  JSX Source
                </label>
                <textarea
                  id="template-jsx-source"
                  className="textarea mono"
                  name="jsxSource"
                  spellCheck={false}
                  rows={28}
                  value={jsx}
                  onChange={(e) => setJsx(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const el = e.currentTarget;
                      const start = el.selectionStart;
                      const end = el.selectionEnd;
                      const next = el.value.slice(0, start) + "  " + el.value.slice(end);
                      setJsx(next);
                      requestAnimationFrame(() => {
                        el.selectionStart = el.selectionEnd = start + 2;
                      });
                    } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                      e.preventDefault();
                      if (jsx !== savedJsx) void patch({ jsxSource: jsx });
                    }
                  }}
                  style={{ fontSize: 12, lineHeight: 1.6, resize: "vertical", minHeight: 420 }}
                />
                <div className="hint">
                  Unsaved changes stay local until you save. Tab inserts 2 spaces · ⌘S / Ctrl+S
                  saves.
                </div>
              </AdminSection>
            </div>
          </>
        ) : (
          <div style={{ padding: 32 }}>
            <AdminEmpty icon={<I.Layout size={28} />} title="No Templates Yet" />
          </div>
        )}
      </section>
    </div>
  );
}
