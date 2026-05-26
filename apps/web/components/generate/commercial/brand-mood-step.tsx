"use client";

import type { BrandLite, BrandFlags, MoodLite } from "./types";

export function BrandMoodStep(props: {
  brands: BrandLite[];
  moods: MoodLite[];
  brandId: string;
  moodId: string | null;
  flags: BrandFlags;
  onBrandChange: (brandId: string) => void;
  onMoodChange: (moodId: string | null) => void;
  onFlagsChange: (flags: BrandFlags) => void;
  disabledMoods?: boolean;
}) {
  const activeBrand = props.brands.find((brand) => brand.id === props.brandId);
  const hasBrand = Boolean(activeBrand);

  return (
    <div className="cg-step-stack">
      <div className="cg-field-row">
        <label>
          <span className="label">Brand</span>
          <select className="select" value={props.brandId} onChange={(event) => props.onBrandChange(event.target.value)}>
            <option value="">Select a brand</option>
            {props.brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="label">Brand palette</span>
          <div className="cg-palette">
            {(activeBrand?.palette ?? []).slice(0, 6).map((color) => (
              <span key={color} style={{ background: color }} />
            ))}
          </div>
        </div>
      </div>
      <div>
        <span className="label">Mood</span>
        {props.disabledMoods ? (
          <p className="qc-empty-note" style={{ margin: "6px 0 10px" }}>
            Moods are not available on the Free plan.
          </p>
        ) : null}
        <div className="cg-mood-grid">
          <button
            type="button"
            className={`cg-mood-card ${props.moodId === null ? "is-selected" : ""}`}
            onClick={() => props.onMoodChange(null)}
          >
            <span className="cg-mood-swatch" />
            <strong>Just my brand</strong>
            <small>Default</small>
          </button>
          {props.moods.slice(0, 7).map((mood) => (
            <button
              type="button"
              key={mood.id}
              disabled={props.disabledMoods}
              className={`cg-mood-card ${props.moodId === mood.id ? "is-selected" : ""}`}
              onClick={() => props.onMoodChange(mood.id)}
            >
              {mood.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mood.img} alt="" />
              ) : (
                <span className="cg-mood-swatch" style={{ background: mood.colors?.[0] ?? "#E4E3FC" }} />
              )}
              <strong>{mood.name}</strong>
              <small>{mood.kind}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="cg-toggle-grid">
        {([
          ["useBrandColors", "Brand colors"],
          ["useBrandLogo", "Brand logo"],
          ["useBrandFonts", "Brand fonts"],
          ["brandStrict", "Strict brand mode"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="cg-toggle-row"
            disabled={!hasBrand}
            onClick={() => props.onFlagsChange({ ...props.flags, [key]: !props.flags[key] })}
          >
            <span>{label}</span>
            <span className={`switch ${hasBrand && props.flags[key] ? "is-on" : ""}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
