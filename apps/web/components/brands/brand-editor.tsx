"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { I } from "@/components/icons";

interface BrandEditorProps {
  brand: {
    id: string;
    name: string;
    sourceUrl: string | null;
    voiceNotes: string | null;
    palette: { primary: string; secondary?: string; accent?: string; extras?: string[] } | null;
    fonts: {
      heading: { family: string; weight?: string };
      body: { family: string; weight?: string };
    } | null;
    createdAt?: string;
    generationCount?: number;
  };
  assets: Array<{ id: string; kind: string; s3Key?: string; url?: string | null }>;
}

type Tab = "logos" | "colors" | "fonts" | "voice" | "references" | "danger";
type PaletteDraft = {
  primary: string;
  secondary: string;
  accent: string;
  extras: string[];
};
type FontsDraft = {
  heading: { family: string; weight: string };
  body: { family: string; weight: string };
};
type Message = { ok: boolean; text: string } | null;

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
const FONT_OPTIONS = [
  "Inter",
  "Cal Sans",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Lato",
  "Nunito",
  "Roboto",
  "Open Sans",
  "Merriweather",
  "Oswald",
];
const WEIGHT_OPTIONS = ["300", "400", "500", "600", "700", "800", "900"];

function dot(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
}

function normalizePalette(
  palette: BrandEditorProps["brand"]["palette"],
  brandId: string,
): PaletteDraft {
  return {
    primary: palette?.primary || dot(brandId),
    secondary: palette?.secondary || "#FFFFFF",
    accent: palette?.accent || "#C97A3F",
    extras: palette?.extras?.length ? palette.extras : [],
  };
}

function normalizeFonts(fonts: BrandEditorProps["brand"]["fonts"]): FontsDraft {
  return {
    heading: {
      family: fonts?.heading.family || "Cal Sans",
      weight: fonts?.heading.weight || "700",
    },
    body: {
      family: fonts?.body.family || "Inter",
      weight: fonts?.body.weight || "400",
    },
  };
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function colorInputValue(value: string): string {
  return isHexColor(value) ? value : "#000000";
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

function AssetCard(props: {
  asset: { id: string; kind: string; url?: string | null };
  label: string;
  imageFit: "contain" | "cover";
  onDelete: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        minHeight: 168,
        padding: 16,
        display: "grid",
        gap: 12,
        alignContent: "center",
        position: "relative",
        background: "var(--cal-white)",
      }}
    >
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-label={`Delete ${props.label}`}
        onClick={props.onDelete}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 30,
          height: 30,
          padding: 0,
          display: "grid",
          placeItems: "center",
        }}
      >
        <I.Trash size={13} />
      </button>
      <div
        className="checker"
        style={{
          height: 112,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          boxShadow: "var(--shadow-ring)",
          overflow: "hidden",
        }}
      >
        {props.asset.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.asset.url}
            alt=""
            style={{
              width: props.imageFit === "cover" ? "100%" : "86%",
              height: props.imageFit === "cover" ? "100%" : 88,
              objectFit: props.imageFit,
            }}
          />
        ) : (
          <span className="t-small">{props.label}</span>
        )}
      </div>
      <div className="t-small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <I.Image size={12} />
        {props.label}
      </div>
    </div>
  );
}

export function BrandEditor(props: BrandEditorProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("colors");
  const [confirmText, setConfirmText] = useState("");
  const [delModal, setDelModal] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "reference" | null>(null);

  const [name, setName] = useState(props.brand.name);
  const [sourceUrl, setSourceUrl] = useState(props.brand.sourceUrl ?? "");
  const [voice, setVoice] = useState(props.brand.voiceNotes ?? "");
  const [palette, setPalette] = useState<PaletteDraft>(() =>
    normalizePalette(props.brand.palette, props.brand.id),
  );
  const [fonts, setFonts] = useState<FontsDraft>(() => normalizeFonts(props.brand.fonts));

  const colors = useMemo(
    () => [palette.primary, palette.secondary, palette.accent, ...palette.extras].filter(Boolean),
    [palette],
  );
  const created = props.brand.createdAt
    ? new Date(props.brand.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
  const initials = name.trim().slice(0, 2).toUpperCase() || "BR";
  const logoAssets = props.assets.filter((asset) => asset.kind === "logo");
  const referenceAssets = props.assets.filter((asset) => asset.kind === "reference");
  const heroLogo = logoAssets.find((asset) => asset.url);
  const labelFor = (i: number): string =>
    ["Primary", "Secondary", "Accent", "Extra 1", "Extra 2", "Extra 3", "Extra 4"][i] ??
    `Color ${i + 1}`;

  async function patch(body: unknown, successText = "Brand updated.") {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/brands/${props.brand.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const details = await res.json().catch(() => null);
        setMessage({
          ok: false,
          text:
            details?.error === "invalid"
              ? "Some values are invalid. Check the fields and try again."
              : "Brand could not be saved.",
        });
        return false;
      }
      setMessage({ ok: true, text: successText });
      router.refresh();
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function saveDetails() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage({ ok: false, text: "Brand name is required." });
      return;
    }
    await patch(
      {
        name: trimmedName,
        sourceUrl: sourceUrl.trim() ? sourceUrl.trim() : null,
      },
      "Brand details saved.",
    );
  }

  async function savePalette() {
    await patch(
      {
        palette: {
          primary: palette.primary.trim() || "#222222",
          ...(palette.secondary.trim() ? { secondary: palette.secondary.trim() } : {}),
          ...(palette.accent.trim() ? { accent: palette.accent.trim() } : {}),
          extras: palette.extras.map((color) => color.trim()).filter(Boolean),
        },
      },
      "Brand colors saved.",
    );
  }

  async function saveFonts() {
    await patch(
      {
        fonts: {
          heading: {
            family: fonts.heading.family.trim() || "Cal Sans",
            ...(fonts.heading.weight ? { weight: fonts.heading.weight } : {}),
          },
          body: {
            family: fonts.body.family.trim() || "Inter",
            ...(fonts.body.weight ? { weight: fonts.body.weight } : {}),
          },
        },
      },
      "Brand fonts saved.",
    );
  }

  async function saveVoice() {
    await patch({ voiceNotes: voice }, "Brand voice saved.");
  }

  async function uploadLogo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading("logo");
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/brands/${props.brand.id}/logo`, {
        method: "POST",
        body,
      });
      if (!res.ok) {
        setMessage({ ok: false, text: "Logo upload failed." });
        return;
      }
      setMessage({ ok: true, text: "Logo uploaded." });
      router.refresh();
    } finally {
      setUploading(null);
    }
  }

  async function uploadReferences(files: FileList | null) {
    if (!files?.length) return;
    setUploading("reference");
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(`/api/brands/${props.brand.id}/assets`, {
          method: "POST",
          body,
        });
        if (!res.ok) {
          setMessage({ ok: false, text: `Reference upload failed: ${file.name}` });
          return;
        }
      }
      setMessage({
        ok: true,
        text: `${files.length} reference image${files.length === 1 ? "" : "s"} uploaded.`,
      });
      router.refresh();
    } finally {
      setUploading(null);
    }
  }

  async function deleteAsset(assetId: string) {
    const res = await fetch(`/api/brands/${props.brand.id}/assets/${assetId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setMessage({ ok: false, text: "Asset could not be deleted." });
      return;
    }
    setMessage({ ok: true, text: "Asset deleted." });
    router.refresh();
  }

  async function deleteBrand() {
    setDelModal(false);
    await fetch(`/api/brands/${props.brand.id}/delete`, { method: "POST" });
    router.push("/brands");
  }

  function setCoreColor(key: "primary" | "secondary" | "accent", value: string) {
    setPalette((current) => ({ ...current, [key]: value }));
  }

  function setExtraColor(index: number, value: string) {
    setPalette((current) => ({
      ...current,
      extras: current.extras.map((color, i) => (i === index ? value : color)),
    }));
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
          marginBottom: 16,
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
                fontFamily: fonts.heading.family,
                fontWeight: fonts.heading.weight,
                fontSize: 28,
              }}
            >
              {initials}
            </div>
          )}
        </div>
        <div>
          <div
            className="t-small"
            style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}
          >
            <I.Globe size={12} />
            {sourceUrl || "No source URL"}
            <span style={{ color: "var(--fg-4)" }}>·</span>
            Created {created}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 1fr", gap: 12 }}>
            <label>
              <span className="label">Brand name</span>
              <input
                className="input input--lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}
              />
            </label>
            <label>
              <span className="label">Source URL</span>
              <input
                className="input"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com"
                autoComplete="off"
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            <Stat label="Generations" value={props.brand.generationCount ?? 0} />
            <Stat label="Logos" value={logoAssets.length} />
            <Stat label="References" value={referenceAssets.length} />
            <Stat label="Colors" value={colors.length} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignSelf: "start" }}>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={saving}
            onClick={() => void saveDetails()}
          >
            <I.Save size={14} />
            Save
          </button>
        </div>
      </div>

      {message ? (
        <div
          className="card"
          role="status"
          style={{
            padding: "10px 12px",
            marginBottom: 16,
            color: message.ok ? "#16794C" : "var(--layertone-red)",
            borderColor: message.ok ? "rgba(22, 121, 76, 0.24)" : "rgba(122, 14, 14, 0.24)",
          }}
        >
          {message.text}
        </div>
      ) : null}

      <div className="tabs" style={{ marginBottom: 24 }}>
        {(["logos", "colors", "fonts", "voice", "references"] as const).map((t) => (
          <button
            key={t}
            type="button"
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
          </button>
        ))}
        <div className="grow" />
        <button
          type="button"
          className={`tab ${tab === "danger" ? "is-active" : ""}`}
          onClick={() => setTab("danger")}
          style={{ color: "var(--layertone-red)" }}
        >
          Danger zone
        </button>
      </div>

      {tab === "logos" ? (
        <div>
          <label className="btn btn--accent" style={{ cursor: "pointer", marginBottom: 16 }}>
            <I.Upload size={14} />
            {uploading === "logo" ? "Uploading..." : "Upload logo"}
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => void uploadLogo(e.currentTarget.files)}
            />
          </label>
          {logoAssets.length === 0 ? (
            <div className="empty card">
              <div className="empty__art">
                <I.Image size={28} />
              </div>
              <div className="empty__title">No logos yet</div>
              <div className="empty__sub">
                Upload SVG, PNG, JPG, or WebP logos for generation and previews.
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
              {logoAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  label="Logo asset"
                  imageFit="contain"
                  onDelete={() => void deleteAsset(asset.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "colors" ? (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {(["primary", "secondary", "accent"] as const).map((key, i) => (
              <label key={key} className="card" style={{ padding: 16 }}>
                <span className="label">{labelFor(i)}</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="color"
                    value={colorInputValue(palette[key])}
                    onChange={(e) => setCoreColor(key, e.target.value)}
                    style={{
                      width: 46,
                      height: 38,
                      padding: 0,
                      border: 0,
                      background: "transparent",
                    }}
                  />
                  <input
                    className="input mono"
                    value={palette[key]}
                    onChange={(e) => setCoreColor(key, e.target.value)}
                    placeholder="#000000"
                    autoComplete="off"
                  />
                </div>
              </label>
            ))}
            {palette.extras.map((color, index) => (
              <label key={index} className="card" style={{ padding: 16 }}>
                <span className="label">{labelFor(index + 3)}</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="color"
                    value={colorInputValue(color)}
                    onChange={(e) => setExtraColor(index, e.target.value)}
                    style={{
                      width: 46,
                      height: 38,
                      padding: 0,
                      border: 0,
                      background: "transparent",
                    }}
                  />
                  <input
                    className="input mono"
                    value={color}
                    onChange={(e) => setExtraColor(index, e.target.value)}
                    placeholder="#000000"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() =>
                      setPalette((current) => ({
                        ...current,
                        extras: current.extras.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <I.Trash size={13} />
                  </button>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() =>
                setPalette((current) => ({ ...current, extras: [...current.extras, "#E8C66B"] }))
              }
            >
              <I.Plus size={14} />
              Add color
            </button>
            <button
              type="button"
              className="btn btn--accent"
              disabled={saving}
              onClick={() => void savePalette()}
            >
              <I.Save size={14} />
              Save colors
            </button>
          </div>

          <div className="t-eyebrow" style={{ marginTop: 32, marginBottom: 12 }}>
            Preview on a sample design
          </div>
          <div
            className="card"
            style={{
              padding: 32,
              background: palette.primary,
              color: palette.accent,
              maxWidth: 520,
            }}
          >
            <div
              style={{
                fontFamily: fonts.heading.family,
                fontWeight: fonts.heading.weight,
                fontSize: 32,
                color: palette.accent,
              }}
            >
              Holiday Sale
            </div>
            <div
              style={{
                fontFamily: fonts.body.family,
                fontWeight: fonts.body.weight,
                fontSize: 14,
                color: palette.extras[0] ?? palette.accent,
                marginTop: 6,
              }}
            >
              30% off everything - this week only
            </div>
            <div
              style={{
                marginTop: 20,
                display: "inline-flex",
                padding: "10px 16px",
                borderRadius: 100,
                background: palette.secondary,
                color: palette.extras[1] ?? palette.primary,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Shop the sale
            </div>
          </div>
        </div>
      ) : null}

      {tab === "fonts" ? (
        <div>
          <datalist id="brand-font-options">
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font} />
            ))}
          </datalist>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {(
              [
                {
                  key: "heading",
                  label: "Heading font",
                  sample: "Cozy living room scenes",
                  size: 30,
                },
                {
                  key: "body",
                  label: "Body font",
                  sample:
                    "We craft a soft, generous register where the product feels warm to hold.",
                  size: 16,
                },
              ] as const
            ).map((fontConfig) => (
              <div key={fontConfig.key} className="card" style={{ padding: 24 }}>
                <div className="t-eyebrow">{fontConfig.label}</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 110px",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <label>
                    <span className="label">Family</span>
                    <input
                      className="input"
                      list="brand-font-options"
                      value={fonts[fontConfig.key].family}
                      onChange={(e) =>
                        setFonts((current) => ({
                          ...current,
                          [fontConfig.key]: {
                            ...current[fontConfig.key],
                            family: e.target.value,
                          },
                        }))
                      }
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    <span className="label">Weight</span>
                    <select
                      className="select"
                      value={fonts[fontConfig.key].weight}
                      onChange={(e) =>
                        setFonts((current) => ({
                          ...current,
                          [fontConfig.key]: {
                            ...current[fontConfig.key],
                            weight: e.target.value,
                          },
                        }))
                      }
                    >
                      {WEIGHT_OPTIONS.map((weight) => (
                        <option key={weight} value={weight}>
                          {weight}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div
                  style={{
                    marginTop: 24,
                    fontFamily: fonts[fontConfig.key].family,
                    fontWeight: fonts[fontConfig.key].weight,
                    fontSize: fontConfig.size,
                    color: "var(--fg-2)",
                    lineHeight: 1.4,
                  }}
                >
                  {fontConfig.sample}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--accent"
            disabled={saving}
            onClick={() => void saveFonts()}
            style={{ marginTop: 16 }}
          >
            <I.Save size={14} />
            Save fonts
          </button>
        </div>
      ) : null}

      {tab === "voice" ? (
        <div style={{ maxWidth: 760 }}>
          <label className="label">Voice notes</label>
          <textarea
            className="textarea"
            rows={8}
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            placeholder="Tone, words to use, words to avoid, product positioning, audience..."
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn--accent"
              disabled={saving}
              onClick={() => void saveVoice()}
            >
              <I.Save size={14} />
              Save voice
            </button>
            <div className="hint">Empty voice notes can now be saved too.</div>
          </div>
        </div>
      ) : null}

      {tab === "references" ? (
        <div>
          <label className="btn btn--accent" style={{ cursor: "pointer", marginBottom: 16 }}>
            <I.Upload size={14} />
            {uploading === "reference" ? "Uploading..." : "Upload reference images"}
            <input
              hidden
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void uploadReferences(e.currentTarget.files)}
            />
          </label>
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
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              {referenceAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  label="Reference image"
                  imageFit="cover"
                  onDelete={() => void deleteAsset(asset.id)}
                />
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
            Cascade-deletes all generations, references, and ledger entries.
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
              This cannot be undone. All generations and reference images for this brand will be
              removed.
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
              <button type="button" className="btn btn--ghost" onClick={() => setDelModal(false)}>
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
