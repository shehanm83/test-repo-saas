"use client";

import { useState } from "react";

export function MoodStudio(props: {
  moods: Array<{
    id: string;
    slug: string;
    name: string;
    kind: string;
    status: string;
    promptModifiers: string;
    negativePrompts: string;
    accentPalette: string[];
    supportedAspectRatios: string[];
  }>;
}) {
  const [selectedId, setSelectedId] = useState(props.moods[0]?.id ?? "");
  const selected = props.moods.find((mood) => mood.id === selectedId) ?? null;

  async function patch(body: unknown) {
    if (!selected) {
      return;
    }
    await fetch(`/api/admin/moods/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="studio-admin-split">
      <aside className="studio-admin-list">
        {props.moods.map((mood) => (
          <button
            key={mood.id}
            className={`studio-admin-list-item${mood.id === selectedId ? " is-active" : ""}`}
            type="button"
            onClick={() => setSelectedId(mood.id)}
          >
            <strong>{mood.name}</strong>
            <span>
              {mood.kind} · {mood.status}
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
              <div className="studio-toolbar">
                <button
                  className="studio-button studio-button--secondary"
                  type="button"
                  onClick={() => void patch({ status: "published" })}
                >
                  Publish
                </button>
                <button
                  className="studio-button studio-button--secondary"
                  type="button"
                  onClick={() => void patch({ status: "archived" })}
                >
                  Archive
                </button>
              </div>
            </div>

            <div className="studio-form-grid">
              <label>
                <span>Name</span>
                <input
                  className="studio-input"
                  defaultValue={selected.name}
                  onBlur={(event) => void patch({ name: event.target.value })}
                />
              </label>
              <label>
                <span>Slug</span>
                <input
                  className="studio-input"
                  defaultValue={selected.slug}
                  onBlur={(event) => void patch({ slug: event.target.value })}
                />
              </label>
            </div>

            <label>
              <span>Prompt modifiers</span>
              <textarea
                className="studio-textarea"
                defaultValue={selected.promptModifiers}
                onBlur={(event) => void patch({ promptModifiers: event.target.value })}
              />
            </label>

            <label>
              <span>Negative prompts</span>
              <textarea
                className="studio-textarea"
                defaultValue={selected.negativePrompts}
                onBlur={(event) => void patch({ negativePrompts: event.target.value })}
              />
            </label>
          </>
        ) : (
          <p>No moods available.</p>
        )}
      </section>
    </div>
  );
}

