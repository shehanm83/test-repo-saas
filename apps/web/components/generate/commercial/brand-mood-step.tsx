"use client";

import type { BrandLite, BrandFlags, MoodLite } from "./types";
import { UpgradeInline } from "@/components/billing/upgrade-inline";

import { MoodPickerControl } from "./mood-picker-dialog";

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
  const colors = (activeBrand?.palette ?? []).filter(Boolean).slice(0, 6);

  return (
    <div className="cg-step-stack">
      <div className="cg-field-row">
        <label>
          <span className="label">Brand</span>
          <select
            className="select"
            value={props.brandId}
            onChange={(event) => props.onBrandChange(event.target.value)}
          >
            <option value="">Select a brand</option>
            {props.brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="label">Brand palette</span>
          <div className="cg-palette">
            {colors.length > 0 ? (
              colors.map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  title={`${brandColorLabel(index)}: ${color}`}
                  style={{ background: color }}
                />
              ))
            ) : (
              <small>{hasBrand ? "No saved colors" : "Select a brand"}</small>
            )}
          </div>
        </div>
      </div>
      <div>
        <span className="label">Mood</span>
        {props.disabledMoods ? (
          <p className="qc-empty-note" style={{ margin: "6px 0 10px" }}>
            <UpgradeInline feature="moods" label="Moods are not available on the Free plan." />
          </p>
        ) : null}
        <MoodPickerControl
          moods={props.moods}
          moodId={props.moodId}
          disabled={props.disabledMoods}
          onMoodChange={props.onMoodChange}
        />
      </div>
      <div className="cg-toggle-grid">
        {(
          [
            ["useBrandColors", "Brand colors"],
            ["useBrandLogo", "Brand logo"],
            ["useBrandFonts", "Brand fonts"],
            ["brandStrict", "Strict brand mode"],
          ] as const
        ).map(([key, label]) => (
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

function brandColorLabel(index: number): string {
  return (
    ["Primary", "Secondary", "Accent", "Extra 1", "Extra 2", "Extra 3"][index] ??
    `Color ${index + 1}`
  );
}
