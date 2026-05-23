import Image from "next/image";
import React from "react";

/**
 * Compact brand mark — layered-squares icon used in chrome (top-bar etc).
 * For the full wordmark use <LayertoneWordmark width=...>.
 */
export function LayertoneMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Layertone"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="lt-top" x1="10" y1="6" x2="54" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF7B7B" />
          <stop offset="1" stopColor="#FF9A5C" />
        </linearGradient>
        <linearGradient id="lt-mid" x1="6" y1="24" x2="58" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6C6FFF" />
          <stop offset="1" stopColor="#4DAFFF" />
        </linearGradient>
        <linearGradient id="lt-bot" x1="6" y1="42" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#26C6DA" />
          <stop offset="1" stopColor="#00ACC1" />
        </linearGradient>
      </defs>
      <path d="M32 6 L54 18 L32 28 L10 18 Z" fill="url(#lt-top)" opacity="0.95" />
      <path d="M10 26 L32 36 L54 26 L54 30 L32 42 L10 30 Z" fill="url(#lt-mid)" opacity="0.9" />
      <path d="M10 38 L32 48 L54 38 L54 44 L32 58 L10 44 Z" fill="url(#lt-bot)" opacity="0.85" />
    </svg>
  );
}

/**
 * Full Layertone wordmark — renders /brand/logo.png.
 * Pass `width` (px); height auto-scales to the image's 3:2 aspect.
 */
const LOGO_W = 1536;
const LOGO_H = 1024;

export function LayertoneWordmark({
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
      alt="Layertone"
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
