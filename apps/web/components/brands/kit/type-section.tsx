"use client";

import {
  BRAND_FONTS,
  BRAND_FONT_CATEGORY_LABELS,
  findBrandFont,
  resolveBrandFont,
  type BrandFontCategory,
  type BrandFontChoice,
  type BrandFontRole,
} from "@layertone/shared/brand/fonts";

import { fontStack, useBrandFontPreview } from "../use-brand-fonts";

const CATEGORIES: BrandFontCategory[] = ["sans", "serif", "slab", "display", "mono", "handwriting"];

export function TypeSection(props: {
  fonts: { heading: BrandFontChoice; body: BrandFontChoice };
  onChange: (fonts: { heading: BrandFontChoice; body: BrandFontChoice }) => void;
}) {
  useBrandFontPreview([props.fonts.heading.family, props.fonts.body.family]);

  return (
    <div className="grid gap-4 min-[900px]:grid-cols-2">
      <FontField
        role="heading"
        label="Headline"
        sample="Cozy living room scenes"
        size={26}
        value={props.fonts.heading}
        onChange={(heading) => props.onChange({ ...props.fonts, heading })}
      />
      <FontField
        role="body"
        label="Body"
        sample="A soft, generous register where the product feels warm to hold."
        size={14.5}
        value={props.fonts.body}
        onChange={(body) => props.onChange({ ...props.fonts, body })}
      />
    </div>
  );
}

function FontField(props: {
  role: BrandFontRole;
  label: string;
  sample: string;
  size: number;
  value: BrandFontChoice;
  onChange: (choice: BrandFontChoice) => void;
}) {
  const weights = findBrandFont(props.value.family)?.weights ?? ["400"];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">
        {props.label}
      </p>
      <div className="grid grid-cols-[1fr_92px] gap-2">
        <select
          className="select h-9 text-[13px]"
          aria-label={`${props.label} font family`}
          value={props.value.family}
          onChange={(event) =>
            props.onChange(
              resolveBrandFont(props.role, {
                family: event.target.value,
                weight: props.value.weight,
              }),
            )
          }
        >
          {CATEGORIES.map((category) => (
            <optgroup key={category} label={BRAND_FONT_CATEGORY_LABELS[category]}>
              {BRAND_FONTS.filter((font) => font.category === category).map((font) => (
                <option key={font.family} value={font.family}>
                  {font.family}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          className="select h-9 text-[13px]"
          aria-label={`${props.label} font weight`}
          value={props.value.weight}
          onChange={(event) =>
            props.onChange({ family: props.value.family, weight: event.target.value })
          }
        >
          {weights.map((weight) => (
            <option key={weight} value={weight}>
              {weight}
            </option>
          ))}
        </select>
      </div>
      <p
        className="mt-3.5 text-ink"
        style={{
          fontFamily: fontStack(
            props.value.family,
            props.role === "heading" ? "serif" : "sans-serif",
          ),
          fontWeight: Number(props.value.weight),
          fontSize: props.size,
          lineHeight: 1.25,
        }}
      >
        {props.sample}
      </p>
    </div>
  );
}
