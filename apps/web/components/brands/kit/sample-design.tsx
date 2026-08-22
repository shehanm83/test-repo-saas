"use client";

import type { BrandFontChoice } from "@layertone/shared/brand/fonts";

import { fontStack } from "../use-brand-fonts";
import { readableInk } from "./color";

/**
 * The same sample composition the palette and typography sections both preview —
 * colours and type applied the way the renderer applies them.
 */
export function SampleDesign(props: {
  palette: string[];
  fonts: { heading: BrandFontChoice; body: BrandFontChoice };
  logoUrl?: string | null;
  compact?: boolean;
}) {
  const [primary = "#242424", secondary = "#f6efe2", accent = "#5e5ce6"] = props.palette;
  const headline = readableInk(primary);

  return (
    <div
      className="overflow-hidden rounded-2xl shadow-card"
      style={{ background: primary, padding: props.compact ? 20 : 28 }}
    >
      {props.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.logoUrl}
          alt=""
          className="mb-4 max-h-7 w-auto object-contain"
          style={{ maxWidth: "40%" }}
        />
      ) : null}
      <p
        className="font-mono uppercase"
        style={{
          color: headline,
          opacity: 0.55,
          fontSize: 9.5,
          letterSpacing: "0.14em",
          marginBottom: props.compact ? 8 : 12,
        }}
      >
        Preview
      </p>
      <p
        style={{
          fontFamily: fontStack(props.fonts.heading.family, "serif"),
          fontWeight: Number(props.fonts.heading.weight),
          fontSize: props.compact ? 24 : 32,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          color: headline,
        }}
      >
        Holiday Sale
      </p>
      <p
        style={{
          fontFamily: fontStack(props.fonts.body.family),
          fontWeight: Number(props.fonts.body.weight),
          fontSize: props.compact ? 12.5 : 14,
          color: headline,
          opacity: 0.75,
          marginTop: 6,
        }}
      >
        30% off everything · this week only
      </p>
      <span
        className="mt-4 inline-flex rounded-full px-4 py-2 text-[12.5px] font-semibold"
        style={{
          background: accent,
          color: readableInk(accent),
          fontFamily: fontStack(props.fonts.body.family),
        }}
      >
        Shop the sale →
      </span>
      <div className="mt-4 flex gap-1.5">
        {[primary, secondary, accent, ...props.palette.slice(3)]
          .filter(Boolean)
          .map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: color, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" }}
            />
          ))}
      </div>
    </div>
  );
}
