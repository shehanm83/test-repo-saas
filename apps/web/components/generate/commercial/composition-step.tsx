"use client";

import type { CompositionControls } from "./types";

function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className="label">{props.label}</span>
      <div className="cg-segmented">
        {props.options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={props.value === option.value ? "is-selected" : ""}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompositionStep(props: {
  value: CompositionControls;
  onChange: (value: CompositionControls) => void;
}) {
  const set = <K extends keyof CompositionControls>(key: K, value: CompositionControls[K]) =>
    props.onChange({ ...props.value, [key]: value });

  return (
    <div className="cg-step-stack">
      <div className="cg-field-row">
        <Segmented
          label="Product prominence"
          value={props.value.productSize}
          options={[
            { value: "small", label: "Small" },
            { value: "balanced", label: "Balanced" },
            { value: "dominant", label: "Dominant" },
          ]}
          onChange={(value) => set("productSize", value)}
        />
        <Segmented
          label="Product position"
          value={props.value.productPosition}
          options={[
            { value: "template", label: "Template" },
            { value: "center", label: "Center" },
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(value) => set("productPosition", value)}
        />
      </div>
      <div className="cg-field-row">
        <Segmented
          label="Background"
          value={props.value.backgroundStyle}
          options={[
            { value: "studio", label: "Studio" },
            { value: "lifestyle", label: "Lifestyle" },
            { value: "abstract", label: "Abstract" },
            { value: "seasonal", label: "Seasonal" },
            { value: "marketplace_white", label: "White" },
            { value: "transparent", label: "Transparent" },
          ]}
          onChange={(value) => set("backgroundStyle", value)}
        />
        <Segmented
          label="Realism"
          value={props.value.realism}
          options={[
            { value: "clean_render", label: "Clean" },
            { value: "realistic_photo", label: "Photo" },
            { value: "premium_editorial", label: "Editorial" },
            { value: "commercial_3d", label: "3D" },
          ]}
          onChange={(value) => set("realism", value)}
        />
      </div>
      <div className="cg-field-row">
        <Segmented
          label="Labels"
          value={props.value.labelVisibility}
          options={[
            { value: "hide", label: "Hide" },
            { value: "preserve", label: "Preserve" },
            { value: "emphasize", label: "Emphasize" },
          ]}
          onChange={(value) => set("labelVisibility", value)}
        />
        <Segmented
          label="Packaging"
          value={props.value.packagingVisibility}
          options={[
            { value: "product_only", label: "Product" },
            { value: "packaging_only", label: "Packaging" },
            { value: "both", label: "Both" },
          ]}
          onChange={(value) => set("packagingVisibility", value)}
        />
      </div>
      <div className="cg-field-row">
        <Segmented
          label="Shadow"
          value={props.value.shadowReflection}
          options={[
            { value: "none", label: "None" },
            { value: "soft_shadow", label: "Soft" },
            { value: "hard_shadow", label: "Hard" },
            { value: "reflection", label: "Reflection" },
          ]}
          onChange={(value) => set("shadowReflection", value)}
        />
        <Segmented
          label="Brand blend"
          value={props.value.brandBlend}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
          onChange={(value) => set("brandBlend", value)}
        />
      </div>
      <button
        type="button"
        className="cg-toggle-row"
        onClick={() => set("keepOriginalShape", !props.value.keepOriginalShape)}
      >
        <span>Keep original shape</span>
        <span className={`switch ${props.value.keepOriginalShape ? "is-on" : ""}`} />
      </button>
    </div>
  );
}
