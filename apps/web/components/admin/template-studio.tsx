"use client";

import React, { useState } from "react";

import { I } from "@/components/icons";

export function TemplateStudio(props: {
  templates: Array<{
    id: string;
    slug: string;
    name: string;
    status: string;
    preferredModel: string;
    jsxSource: string;
  }>;
}) {
  const [selectedId, setSelectedId] = useState(props.templates[0]?.id ?? "");
  const selected = props.templates.find((t) => t.id === selectedId) ?? null;
  const [jsx, setJsx] = useState(selected?.jsxSource ?? "");

  React.useEffect(() => {
    setJsx(selected?.jsxSource ?? "");
  }, [selected?.id, selected]);

  async function patch(body: unknown) {
    if (!selected) return;
    await fetch(`/api/admin/templates/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        height: "calc(100vh - var(--header-h))",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid var(--cal-gray-200)",
          background: "var(--cal-gray-50)",
          padding: 12,
          overflowY: "auto",
        }}
      >
        <div className="t-eyebrow" style={{ marginBottom: 12, paddingLeft: 4 }}>
          <I.Layout size={11} style={{ verticalAlign: "-1px" }} /> Templates
        </div>
        {props.templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: 10,
              borderRadius: 6,
              cursor: "pointer",
              background: t.id === selectedId ? "white" : "transparent",
              boxShadow: t.id === selectedId ? "var(--shadow-ring)" : "none",
              marginBottom: 2,
              width: "100%",
              textAlign: "left",
              border: 0,
            }}
          >
            <strong style={{ fontSize: 13 }}>{t.name}</strong>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
              {t.preferredModel} · {t.status}
            </span>
          </button>
        ))}
      </aside>

      <section style={{ overflowY: "auto", padding: 32 }}>
        {selected ? (
          <>
            <div className="page__head">
              <div>
                <h1 className="page__title">{selected.name}</h1>
                <p className="page__sub mono">{selected.slug}</p>
              </div>
              <span
                className={`pill ${
                  selected.status === "published" ? "pill--green" : ""
                }`}
              >
                {selected.status}
              </span>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <label className="label">JSX source</label>
              <textarea
                className="textarea mono"
                rows={20}
                value={jsx}
                onChange={(e) => setJsx(e.target.value)}
                onBlur={() => void patch({ jsxSource: jsx })}
                style={{ fontSize: 12, lineHeight: 1.5 }}
              />
              <div className="hint">Saved on blur.</div>
            </div>
          </>
        ) : (
          <div className="empty">
            <div className="empty__art">
              <I.Layout size={28} />
            </div>
            <div className="empty__title">No templates yet</div>
          </div>
        )}
      </section>
    </div>
  );
}
