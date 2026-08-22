"use client";

import { useEffect } from "react";

import { brandFontStylesheetUrl } from "@layertone/shared/brand/fonts";

/**
 * Loads the given brand families from Google Fonts so previews render in the
 * face the renderer will actually use. Stylesheets are appended once per URL and
 * left in place — a picker moves through a handful of families per session.
 */
export function useBrandFontPreview(families: readonly string[], weight?: string): void {
  const key = families.join("|");

  useEffect(() => {
    const url = brandFontStylesheetUrl(key.split("|").filter(Boolean), weight);
    if (!url) return;
    const alreadyLoaded = Array.from(
      document.querySelectorAll<HTMLLinkElement>("link[data-brand-font]"),
    ).some((link) => link.dataset.brandFont === url);
    if (alreadyLoaded) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.brandFont = url;
    document.head.appendChild(link);
  }, [key, weight]);
}

/** CSS font stack for a brand family, with a sensible fallback while it loads. */
export function fontStack(family: string, fallback = "sans-serif"): string {
  return `"${family}", ${fallback}`;
}
