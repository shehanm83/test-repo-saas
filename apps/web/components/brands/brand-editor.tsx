"use client";

import { useState } from "react";

export function BrandEditor(props: {
  brand: {
    id: string;
    name: string;
    sourceUrl: string | null;
    voiceNotes: string | null;
    palette: { primary: string; secondary?: string; accent?: string; extras?: string[] } | null;
    fonts:
      | {
          heading: { family: string; weight?: string };
          body: { family: string; weight?: string };
        }
      | null;
  };
  assets: Array<{ id: string; kind: string }>;
}) {
  const [tab, setTab] = useState<"colors" | "fonts" | "voice" | "references" | "danger">(
    "colors",
  );
  const [confirm, setConfirm] = useState("");
  const palette = props.brand.palette ?? {
    primary: "#222222",
    secondary: "#666666",
    accent: "#5E5CE6",
    extras: ["#EDEBF8"],
  };
  const colors = [palette.primary, palette.secondary, palette.accent, ...(palette.extras ?? [])].filter(
    Boolean,
  ) as string[];

  async function patch(body: unknown) {
    await fetch(`/api/brands/${props.brand.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="studio-page">
      <div className="studio-brand-hero">
        <div className="studio-brand-preview">
          <div className="studio-brand-preview__mark">{props.brand.name.slice(0, 2).toUpperCase()}</div>
        </div>
        <div className="studio-brand-hero__body">
          <input
            className="studio-brand-name-input"
            defaultValue={props.brand.name}
            onBlur={(event) => void patch({ name: event.target.value })}
          />
          <p>{props.brand.sourceUrl ?? "No source URL recorded yet."}</p>
        </div>
      </div>

      <div className="studio-tab-row">
        {[
          ["colors", "Colors"],
          ["fonts", "Fonts"],
          ["voice", "Voice"],
          ["references", "References"],
          ["danger", "Danger zone"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`studio-tab${tab === key ? " is-active" : ""}`}
            type="button"
            onClick={() => setTab(key as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "colors" ? (
        <div className="studio-card studio-copy-card">
          <h2>Palette</h2>
          <div className="studio-color-grid">
            {colors.map((color, index) => (
              <label key={`${color}-${index}`} className="studio-color-card">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => {
                    const next = colors.map((entry, entryIndex) =>
                      entryIndex === index ? event.target.value : entry,
                    );
                    void patch({
                      palette: {
                        primary: next[0],
                        secondary: next[1],
                        accent: next[2],
                        extras: next.slice(3),
                      },
                    });
                  }}
                />
                <span style={{ background: color }} />
                <strong>{color}</strong>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "fonts" ? (
        <div className="studio-two-column">
          <div className="studio-card studio-copy-card">
            <h2>Heading font</h2>
            <input
              className="studio-input"
              defaultValue={props.brand.fonts?.heading.family ?? "Cal Sans"}
              onBlur={(event) =>
                void patch({
                  fonts: {
                    heading: { family: event.target.value, weight: "600" },
                    body: props.brand.fonts?.body ?? { family: "Inter", weight: "400" },
                  },
                })
              }
            />
          </div>
          <div className="studio-card studio-copy-card">
            <h2>Body font</h2>
            <input
              className="studio-input"
              defaultValue={props.brand.fonts?.body.family ?? "Inter"}
              onBlur={(event) =>
                void patch({
                  fonts: {
                    heading: props.brand.fonts?.heading ?? { family: "Cal Sans", weight: "600" },
                    body: { family: event.target.value, weight: "400" },
                  },
                })
              }
            />
          </div>
        </div>
      ) : null}

      {tab === "voice" ? (
        <div className="studio-card studio-copy-card">
          <h2>Voice notes</h2>
          <textarea
            className="studio-textarea"
            defaultValue={props.brand.voiceNotes ?? ""}
            rows={8}
            onBlur={(event) => void patch({ voiceNotes: event.target.value })}
          />
        </div>
      ) : null}

      {tab === "references" ? (
        <div className="studio-card studio-copy-card">
          <h2>References</h2>
          <div className="studio-reference-grid">
            {props.assets.map((asset) => (
              <div key={asset.id} className="studio-reference-tile">
                <div className="studio-reference-art" />
                <strong>{asset.kind}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "danger" ? (
        <div className="studio-card studio-copy-card studio-danger-card">
          <h2>Delete brand</h2>
          <p>Type the brand name to confirm the cascade delete.</p>
          <input className="studio-input" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          <button
            className="studio-button studio-button--danger"
            disabled={confirm !== props.brand.name}
            type="button"
            onClick={async () => {
              await fetch(`/api/brands/${props.brand.id}/delete`, { method: "POST" });
              window.location.href = "/brands";
            }}
          >
            Delete brand
          </button>
        </div>
      ) : null}
    </div>
  );
}

