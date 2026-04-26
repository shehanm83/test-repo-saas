"use client";

import { PLATFORM_FORMATS } from "@studio/shared/output-targets";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type OutputTarget =
  | { kind: "social"; platform: string; format: string }
  | { kind: "image"; aspectRatio: "1:1" | "4:5" | "9:16" | "16:9" };

const FLAG_OPTIONS = [
  ["Use brand colors", "useBrandColors"],
  ["Use brand logo", "useBrandLogo"],
  ["Use brand fonts", "useBrandFonts"],
  ["Brand-strict mode", "brandStrict"],
  ["Apply mood prompt modifiers", "applyMoodModifiers"],
  ["Apply mood decorative motifs", "applyMoodDecorations"],
  ["Apply mood accent colors", "applyMoodAccentColors"],
  ["Premium model", "usePremiumModel"],
] as const;

export function StudioGenerate(props: {
  brands: Array<{ id: string; name: string }>;
  moods: Array<{ id: string; name: string; kind: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brief, setBrief] = useState("");
  const [pending, setPending] = useState(false);
  const [brandId, setBrandId] = useState(props.brands[0]?.id ?? "");
  const [moodId, setMoodId] = useState(searchParams.get("moodId") ?? "");
  const [target, setTarget] = useState<OutputTarget>({
    kind: "social",
    platform: "instagram",
    format: "post",
  });
  const [flags, setFlags] = useState({
    useBrandColors: true,
    useBrandLogo: true,
    useBrandFonts: true,
    brandStrict: false,
    applyMoodModifiers: true,
    applyMoodDecorations: true,
    applyMoodAccentColors: true,
    usePremiumModel: false,
  });
  const [inspiration, setInspiration] = useState<{
    uploadId: string;
    previewUrl: string;
    influence: "subtle" | "balanced" | "strong";
  } | null>(null);

  const aspectRatio =
    target.kind === "image"
      ? target.aspectRatio
      : (PLATFORM_FORMATS.find(
          (entry) => entry.platform === target.platform && entry.format === target.format,
        )?.aspectRatio ?? "1:1");

  const estimatedCredits = 4 * (flags.usePremiumModel ? 15 : inspiration ? 7 : 5);

  const groupedMoods = useMemo(
    () => ({
      rightNow: props.moods.filter((mood) => mood.kind === "seasonal").slice(0, 3),
      always: props.moods.filter((mood) => mood.kind === "evergreen"),
    }),
    [props.moods],
  );

  async function uploadInspiration(file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/uploads/inspiration", { method: "POST", body });
    const payload = await response.json();
    setInspiration({
      uploadId: payload.uploadId,
      previewUrl: URL.createObjectURL(file),
      influence: "balanced",
    });
  }

  async function submit() {
    setPending(true);
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId,
          moodId: moodId || null,
          brief,
          outputTarget: target,
          inspirationUploadId: inspiration?.uploadId,
          inspirationInfluence: inspiration?.influence,
          flags,
        }),
      });
      const payload = await response.json();
      if (payload.generationId) {
        router.push(`/generations/${payload.generationId}`);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="generate-layout">
      <section className="generate-primary">
        <div className="generate-header">
          <span className="generate-kicker">Generation flow</span>
          <h1>New generation</h1>
          <p>
            Describe what you want. Studio applies brand grounding, mood styling, and the
            approved template direction automatically.
          </p>
        </div>

        <div className="generate-section">
          <label className="generate-label">Output target</label>
          <div className="generate-chip-row">
            <button
              className={`generate-chip${target.kind === "social" ? " is-active" : ""}`}
              type="button"
              onClick={() =>
                setTarget({
                  kind: "social",
                  platform: "instagram",
                  format: "post",
                })
              }
            >
              For social
            </button>
            <button
              className={`generate-chip${target.kind === "image" ? " is-active" : ""}`}
              type="button"
              onClick={() => setTarget({ kind: "image", aspectRatio: "1:1" })}
            >
              Just an image
            </button>
          </div>

          {target.kind === "social" ? (
            <div className="generate-chip-row">
              {PLATFORM_FORMATS.slice(0, 6).map((item) => (
                <button
                  key={`${item.platform}-${item.format}`}
                  className={`generate-chip${
                    target.kind === "social" &&
                    target.platform === item.platform &&
                    target.format === item.format
                      ? " is-active"
                      : ""
                  }`}
                  type="button"
                  onClick={() =>
                    setTarget({
                      kind: "social",
                      platform: item.platform,
                      format: item.format,
                    })
                  }
                >
                  {item.platform} · {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="generate-section">
          <label className="generate-label" htmlFor="brief">
            Brief
          </label>
          <div className="generate-textarea-wrap">
            <textarea
              className="generate-textarea"
              id="brief"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder={`Describe what you want. e.g. "Christmas sale, cozy living room with a glowing tree, 30% off".`}
            />
            <span className="generate-counter">{brief.length} / 500</span>
          </div>
        </div>

        <div className="generate-section">
          <label className="generate-label">Inspiration image</label>
          {!inspiration ? (
            <label className="studio-upload-drop studio-upload-drop--compact">
              <strong>Drop an inspiration image</strong>
              <span>Used only for this generation</span>
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadInspiration(file);
                  }
                }}
              />
            </label>
          ) : (
            <div className="studio-inline-upload">
              <img alt="" src={inspiration.previewUrl} />
              <div>
                <strong>Influence</strong>
                <div className="generate-chip-row">
                  {(["subtle", "balanced", "strong"] as const).map((value) => (
                    <button
                      key={value}
                      className={`generate-chip${inspiration.influence === value ? " is-active" : ""}`}
                      type="button"
                      onClick={() => setInspiration({ ...inspiration, influence: value })}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="generate-grid-two">
          <div className="generate-section">
            <label className="generate-label">Brand</label>
            <select
              className="studio-input"
              value={brandId}
              onChange={(event) => setBrandId(event.target.value)}
            >
              {props.brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className="generate-section">
            <label className="generate-label">Aspect ratio</label>
            <div className="generate-chip-row">
              {(["1:1", "4:5", "9:16", "16:9"] as const).map((ratio) => (
                <button
                  key={ratio}
                  className={`generate-chip${aspectRatio === ratio ? " is-active" : ""}`}
                  disabled={target.kind !== "image"}
                  type="button"
                  onClick={() => setTarget({ kind: "image", aspectRatio: ratio })}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="generate-section">
          <label className="generate-label">Mood</label>
          <div className="studio-mood-groups">
            <div>
              <span className="generate-kicker">Right now</span>
              <div className="generate-mood-row">
                {groupedMoods.rightNow.map((mood) => (
                  <button
                    key={mood.id}
                    className={`generate-mood-card${moodId === mood.id ? " is-active" : ""}`}
                    type="button"
                    onClick={() => setMoodId(mood.id)}
                  >
                    <div className="generate-mood-card__art" />
                    <strong>{mood.name}</strong>
                    <span>{mood.kind}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="generate-kicker">Always available</span>
              <div className="generate-mood-row">
                {groupedMoods.always.map((mood) => (
                  <button
                    key={mood.id}
                    className={`generate-mood-card${moodId === mood.id ? " is-active" : ""}`}
                    type="button"
                    onClick={() => setMoodId(mood.id)}
                  >
                    <div className="generate-mood-card__art" />
                    <strong>{mood.name}</strong>
                    <span>{mood.kind}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="generate-actions">
          <button
            className="generate-button"
            disabled={pending || brief.trim().length === 0 || !brandId}
            type="button"
            onClick={() => void submit()}
          >
            {pending ? "Starting…" : "Generate 4 variants"}
          </button>
          <span className="generate-actions__meta">{estimatedCredits} credits total</span>
        </div>
      </section>

      <aside className="generate-sidebar">
        <div className="generate-panel">
          <span className="generate-panel__eyebrow">Brand grounding</span>
          <div className="generate-toggle-list">
            {FLAG_OPTIONS.map(([label, key]) => (
              <button
                key={key}
                className="generate-toggle-row"
                type="button"
                onClick={() =>
                  setFlags((current) => ({
                    ...current,
                    [key]: !current[key],
                  }))
                }
              >
                <span>{label}</span>
                <span
                  className={`generate-switch${flags[key] ? " is-on" : ""}`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="generate-panel">
          <span className="generate-panel__eyebrow">Selection summary</span>
          <strong className="generate-panel__title">Campaign run</strong>
          <p>
            {target.kind === "social"
              ? `${target.platform} · ${target.format}`
              : `Just an image · ${target.aspectRatio}`}{" "}
            · 4 variants · {flags.usePremiumModel ? "Premium model" : "Standard model"}.
          </p>
          <div className="generate-summary-row">
            <span>Estimated cost</span>
            <strong>{estimatedCredits} credits</strong>
          </div>
        </div>
      </aside>
    </div>
  );
}
