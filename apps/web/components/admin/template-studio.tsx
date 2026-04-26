"use client";

import { useState } from "react";

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
  const selected = props.templates.find((template) => template.id === selectedId) ?? null;

  async function patch(body: unknown) {
    if (!selected) {
      return;
    }
    await fetch(`/api/admin/templates/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="studio-admin-split">
      <aside className="studio-admin-list">
        {props.templates.map((template) => (
          <button
            key={template.id}
            className={`studio-admin-list-item${template.id === selectedId ? " is-active" : ""}`}
            type="button"
            onClick={() => setSelectedId(template.id)}
          >
            <strong>{template.name}</strong>
            <span>
              {template.preferredModel} · {template.status}
            </span>
          </button>
        ))}
      </aside>

      <section className="studio-card studio-copy-card">
        {selected ? (
          <>
            <div className="studio-page-head">
              <div>
                <h1>{selected.name}</h1>
                <p>{selected.slug}</p>
              </div>
            </div>
            <label>
              <span>JSX source</span>
              <textarea
                className="studio-codearea"
                defaultValue={selected.jsxSource}
                onBlur={(event) => void patch({ jsxSource: event.target.value })}
              />
            </label>
          </>
        ) : (
          <p>No templates available.</p>
        )}
      </section>
    </div>
  );
}

