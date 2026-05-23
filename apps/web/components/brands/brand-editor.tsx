"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { I } from "@/components/icons";

interface BrandEditorProps {
  brand: {
    id: string;
    name: string;
    sourceUrl: string | null;
    voiceNotes: string | null;
    palette:
      | { primary: string; secondary?: string; accent?: string; extras?: string[] }
      | null;
    fonts:
      | {
          heading: { family: string; weight?: string };
          body: { family: string; weight?: string };
        }
      | null;
    createdAt?: string;
    generationCount?: number;
  };
  assets: Array<{ id: string; kind: string; s3Key?: string; url?: string | null }>;
}

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
function dot(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{value}</div>
      <div className="t-small" style={{ fontSize: 11 }}>
        {label}
      </div>
    </div>
  );
}

export function BrandEditor(props: BrandEditorProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"logos" | "colors" | "fonts" | "voice" | "references" | "danger">(
    "colors",
  );
  const [confirmText, setConfirmText] = useState("");
  const [delModal, setDelModal] = useState(false);
  const [voice, setVoice] = useState(props.brand.voiceNotes ?? "");
  const [name, setName] = useState(props.brand.name);
  const [editingName, setEditingName] = useState(false);

  const palette = props.brand.palette ?? {
    primary: "#222222",
    secondary: "#666666",
    accent: "#5E5CE6",
    extras: [] as string[],
  };
  const colors = [
    palette.primary,
    palette.secondary,
    palette.accent,
    ...(palette.extras ?? []),
  ].filter((c): c is string => Boolean(c));

  const fontHeading = props.brand.fonts?.heading.family ?? "Cal Sans";
  const fontBody = props.brand.fonts?.body.family ?? "Inter";
  const created = props.brand.createdAt
    ? new Date(props.brand.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const initials = props.brand.name.slice(0, 2).toUpperCase();
  const logoAssets = props.assets.filter((asset) => asset.kind === "logo");
  const referenceAssets = props.assets.filter((asset) => asset.kind === "reference");
  const heroLogo = logoAssets.find((asset) => asset.url);
  const labelFor = (i: number): string =>
    ["Primary", "Secondary", "Accent", "Extra 1", "Extra 2", "Extra 3", "Extra 4"][i] ??
    `Color ${i + 1}`;

  async function patch(body: unknown) {
    await fetch(`/api/brands/${props.brand.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function deleteBrand() {
    setDelModal(false);
    await fetch(`/api/brands/${props.brand.id}/delete`, { method: "POST" });
    router.push("/brands");
  }

  return (
    <div className="page">
      <div
        className="card"
        style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "120px 1fr auto",
          gap: 24,
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div
          className="checker"
          style={{
            width: 120,
            height: 120,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            boxShadow: "var(--shadow-ring)",
          }}
        >
          {heroLogo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroLogo.url}
              alt=""
              style={{
                maxWidth: 86,
                maxHeight: 86,
                objectFit: "contain",
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 14,
                background: palette.primary || dot(props.brand.id),
                color: palette.accent || "white",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-display)",
                fontSize: 28,
              }}
            >
              {initials}
            </div>
          )}
        </div>
        <div>
          {editingName ? (
            <input
              className="input input--lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                setEditingName(false);
                if (name !== props.brand.name) void patch({ name });
              }}
              autoFocus
              style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600 }}
            />
          ) : (
            <h1 className="t-h2" style={{ margin: 0 }}>
              {props.brand.name}
            </h1>
          )}
          <div
            className="t-small"
            style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}
          >
            <I.Globe size={12} />
            {props.brand.sourceUrl ?? "—"}
            <span style={{ color: "var(--fg-4)" }}>·</span>
            Created {created}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            <Stat label="Generations" value={props.brand.generationCount ?? 0} />
            <Stat label="Logos" value={logoAssets.length} />
            <Stat label="References" value={referenceAssets.length} />
            <Stat label="Colors" value={colors.length} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setEditingName(true)}
          >
            <I.Edit size={14} />
            Edit name
          </button>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => router.push("/generate")}
          >
            <I.Sparkle size={14} />
            Generate
          </button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        {(["logos", "colors", "fonts", "voice", "references"] as const).map((t) => (
          <div
            key={t}
            className={`tab ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
            style={{ textTransform: "capitalize" }}
          >
            {t}
            {t === "logos" ? (
              <span
                className="pill"
                style={{ height: 18, fontSize: 10, marginLeft: 4, padding: "0 6px" }}
              >
                {logoAssets.length}
              </span>
            ) : null}
            {t === "references" ? (
              <span
                className="pill"
                style={{ height: 18, fontSize: 10, marginLeft: 4, padding: "0 6px" }}
              >
                {referenceAssets.length}
              </span>
            ) : null}
          </div>
        ))}
        <div className="grow" />
        <div
          className={`tab ${tab === "danger" ? "is-active" : ""}`}
          onClick={() => setTab("danger")}
          style={{ color: "var(--layertone-red)" }}
        >
          Danger zone
        </div>
      </div>

      {tab === "logos" ? (
        <div>
          {logoAssets.length === 0 ? (
            <div className="empty card">
              <div className="empty__art">
                <I.Image size={28} />
              </div>
              <div className="empty__title">No logos yet</div>
              <div className="empty__sub">
                Add logos from brand creation so generation can use your identity assets.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {logoAssets.map((a) => (
                <div
                  key={a.id}
                  className="card"
                  style={{
                    minHeight: 160,
                    padding: 16,
                    display: "grid",
                    gap: 12,
                    alignContent: "center",
                    position: "relative",
                    background: "var(--cal-white)",
                  }}
                >
                  <div
                    className="checker"
                    style={{
                      height: 104,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "var(--shadow-ring)",
                    }}
                  >
                    {a.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.url}
                        alt=""
                        style={{
                          maxWidth: "86%",
                          maxHeight: 82,
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <span className="t-small">Logo asset</span>
                    )}
                  </div>
                  <div className="t-small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <I.Image size={12} />
                    Logo asset
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "colors" ? (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {colors.map((c, i) => (
              <div key={i} style={{ width: 140, position: "relative" }}>
                <div
                  style={{
                    height: 140,
                    borderRadius: 12,
                    background: c,
                    boxShadow: "var(--shadow-ring)",
                    cursor: "pointer",
                  }}
                />
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>
                  {labelFor(i)}
                </div>
                <div className="mono t-small" style={{ fontSize: 11 }}>
                  {c}
                </div>
              </div>
            ))}
            <div
              style={{
                width: 140,
                height: 140,
                border: "2px dashed var(--cal-gray-300)",
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                color: "var(--fg-3)",
                cursor: "pointer",
              }}
            >
              <I.Plus size={20} />
            </div>
          </div>

          <div className="t-eyebrow" style={{ marginTop: 32, marginBottom: 12 }}>
            Preview on a sample design
          </div>
          <div
            className="card"
            style={{
              padding: 32,
              background: colors[0] ?? "#222",
              color: colors[2] ?? "#fff",
              maxWidth: 480,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 32,
                color: colors[2] ?? "#fff",
              }}
            >
              Holiday Sale
            </div>
            <div
              style={{
                fontSize: 14,
                color: colors[3] ?? colors[2] ?? "#fff",
                marginTop: 6,
              }}
            >
              30% off everything · this week only
            </div>
            <div
              style={{
                marginTop: 20,
                display: "inline-flex",
                padding: "10px 16px",
                borderRadius: 100,
                background: colors[1] ?? "#fff",
                color: colors[4] ?? colors[2] ?? "white",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Shop the sale →
            </div>
          </div>
        </div>
      ) : null}

      {tab === "fonts" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {(
            [
              {
                l: "Heading font",
                v: fontHeading,
                sample: "Cozy living room scenes",
                isDisplay: true,
              },
              {
                l: "Body font",
                v: fontBody,
                sample:
                  "We craft a soft, generous register where the product feels warm to hold.",
                isDisplay: false,
              },
            ] as const
          ).map((f, i) => (
            <div key={i} className="card" style={{ padding: 24 }}>
              <div className="t-eyebrow">{f.l}</div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                }}
              >
                {f.v}
              </div>
              <div
                style={{
                  marginTop: 24,
                  fontFamily: f.isDisplay ? "var(--font-display)" : "var(--font-body)",
                  fontSize: f.isDisplay ? 28 : 16,
                  color: "var(--fg-2)",
                  lineHeight: 1.4,
                }}
              >
                {f.sample}
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                style={{ marginTop: 24 }}
              >
                Change font
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "voice" ? (
        <div style={{ maxWidth: 720 }}>
          <label className="label">Voice notes</label>
          <textarea
            className="textarea"
            rows={8}
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            onBlur={() => {
              if (voice !== props.brand.voiceNotes) void patch({ voiceNotes: voice });
            }}
          />
          <div className="hint">Saved automatically when you click away.</div>
        </div>
      ) : null}

      {tab === "references" ? (
        <div>
          <button type="button" className="btn btn--accent" style={{ marginBottom: 16 }}>
            <I.Plus size={14} />
            Add reference images
          </button>
          {referenceAssets.length === 0 ? (
            <div className="empty card">
              <div className="empty__art">
                <I.Image size={28} />
              </div>
              <div className="empty__title">No reference images yet</div>
              <div className="empty__sub">
                Upload PNG, JPG, or WebP files to ground generations in your visual style.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 12,
              }}
            >
              {referenceAssets.map((a) => (
                <div
                  key={a.id}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: 10,
                    overflow: "hidden",
                    boxShadow: "var(--shadow-ring)",
                    cursor: "pointer",
                    position: "relative",
                    background: "var(--cal-gray-100)",
                  }}
                >
                  {a.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "danger" ? (
        <div
          className="card"
          style={{ padding: 24, maxWidth: 640, borderTop: "3px solid var(--layertone-red)" }}
        >
          <h3 className="t-h4" style={{ margin: 0, color: "var(--layertone-red)" }}>
            Delete this brand
          </h3>
          <p className="t-small" style={{ marginTop: 6 }}>
            Cascade-deletes all generations, references, and ledger entries (the last is
            recorded as audit).
          </p>
          <button
            type="button"
            className="btn btn--secondary btn--danger"
            style={{ marginTop: 16 }}
            onClick={() => setDelModal(true)}
          >
            <I.Trash size={14} />
            Delete {props.brand.name}
          </button>
        </div>
      ) : null}

      {delModal ? (
        <>
          <div className="scrim" onClick={() => setDelModal(false)} />
          <div className="modal">
            <h2 className="t-h3" style={{ margin: 0 }}>
              Delete {props.brand.name}?
            </h2>
            <p className="t-small" style={{ marginTop: 8 }}>
              This cannot be undone. All generations and reference images for this brand will
              be removed.
            </p>
            <label className="label" style={{ marginTop: 20 }}>
              Type &quot;{props.brand.name}&quot; to confirm
            </label>
            <input
              className="input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 24,
              }}
            >
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setDelModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--accent"
                disabled={confirmText !== props.brand.name}
                style={{ background: "var(--layertone-red)" }}
                onClick={() => void deleteBrand()}
              >
                Delete brand
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
