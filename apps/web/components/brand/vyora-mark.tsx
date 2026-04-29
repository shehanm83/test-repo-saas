import Image from "next/image";
import React from "react";

/**
 * Compact brand mark — small SVG V used in chrome (top-bar etc).
 * For the marketing hero use <VyoraWordmark width=...> which renders
 * the full logo.png composition (V + Vyora + tagline).
 */
export function VyoraMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Vyora"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="vyora-v" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9C5BFF" />
          <stop offset="0.55" stopColor="#6E5BE6" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <path d="M9 7 L22 7 L32 38 L42 7 L55 7 L36 58 L28 58 Z" fill="url(#vyora-v)" />
    </svg>
  );
}

/**
 * Full Vyora wordmark — renders the brand asset at /brand/logo.png
 * (V mark + "Vyora" + "CREATE BEYOND IMAGINATION" tagline).
 * Pass `width` (px) and the height auto-scales to the image's 3:2 aspect.
 *
 * The legacy `size` / `textSize` props from the SVG variant are accepted
 * but ignored — call sites are progressively migrating to `width`.
 */
// Trimmed logo asset is 737×609 (aspect ≈ 0.826).
const LOGO_W = 737;
const LOGO_H = 609;

export function VyoraWordmark({
  width = 240,
}: {
  width?: number;
  size?: number;
  textSize?: number;
  color?: string;
  gap?: number;
}) {
  const height = Math.round((width * LOGO_H) / LOGO_W);
  return (
    <Image
      src="/brand/logo.png"
      alt="Vyora — create beyond imagination"
      width={width}
      height={height}
      priority
      style={{
        display: "block",
        width,
        height: "auto",
        objectFit: "contain",
      }}
    />
  );
}
