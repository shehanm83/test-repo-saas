"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import {
  BRAND_FONTS,
  BRAND_FONT_CATEGORY_LABELS,
  findBrandFont,
  resolveBrandFont,
  type BrandFontChoice,
  type BrandFontRole,
} from "@layertone/shared/brand/fonts";

import { fontStack, useBrandFontPreview } from "../use-brand-fonts";

const ALL_FONT_FAMILIES = BRAND_FONTS.map((font) => font.family);

export function TypeSection(props: {
  fonts: { heading: BrandFontChoice; body: BrandFontChoice };
  onChange: (fonts: { heading: BrandFontChoice; body: BrandFontChoice }) => void;
}) {
  // The catalogue is curated and finite. Loading its regular faces once lets
  // every result be shown honestly instead of styling a native <option>, which
  // browsers do not render consistently.
  useBrandFontPreview(ALL_FONT_FAMILIES, "400");
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
        <FontFamilyPicker
          label={props.label}
          value={props.value.family}
          onChange={(family) =>
            props.onChange(
              resolveBrandFont(props.role, {
                family,
                weight: props.value.weight,
              }),
            )
          }
        />
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

function FontFamilyPicker(props: {
  label: string;
  value: string;
  onChange: (family: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = findBrandFont(props.value);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return BRAND_FONTS;
    return BRAND_FONTS.filter(
      (font) =>
        font.family.toLowerCase().includes(needle) ||
        BRAND_FONT_CATEGORY_LABELS[font.category].toLowerCase().includes(needle),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function choose(family: string) {
    props.onChange(family);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        className="select flex h-9 w-full items-center justify-between gap-2 text-left text-[13px]"
        role="combobox"
        aria-label={`${props.label} font family`}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate" style={{ fontFamily: fontStack(props.value) }}>
          {props.value}
        </span>
        <ChevronDown size={13} className="shrink-0 text-ink-soft" />
      </button>

      {open ? (
        <div className="absolute left-0 top-10 z-30 w-[min(360px,calc(100vw-48px))] rounded-xl bg-white p-2 shadow-[0_18px_50px_rgba(25,23,20,0.18)] ring-1 ring-ink/10">
          <label className="flex items-center gap-2 rounded-lg bg-cream px-2.5">
            <Search size={13} className="shrink-0 text-ink-soft" />
            <input
              ref={search}
              className="h-9 min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-soft/50"
              type="search"
              aria-label={`Search ${props.label.toLowerCase()} fonts`}
              placeholder="Search family or category"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
                if (event.key === "Enter" && results[0]) {
                  event.preventDefault();
                  choose(results[0].family);
                }
              }}
            />
          </label>

          <ul id={listId} role="listbox" className="mt-2 max-h-72 overflow-y-auto">
            {results.map((font) => (
              <li key={font.family}>
                <button
                  type="button"
                  role="option"
                  aria-selected={font.family === props.value}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-cream focus-visible:bg-cream focus-visible:outline-none"
                  onClick={() => choose(font.family)}
                >
                  <span
                    className="w-12 shrink-0 text-[17px] text-ink"
                    style={{ fontFamily: fontStack(font.family) }}
                    aria-hidden="true"
                  >
                    Aa
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[13px] text-ink"
                      style={{ fontFamily: fontStack(font.family) }}
                    >
                      {font.family}
                    </span>
                    <span className="block font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-soft/60">
                      {BRAND_FONT_CATEGORY_LABELS[font.category]}
                    </span>
                  </span>
                  {font.family === props.value ? (
                    <Check size={13} className="shrink-0 text-brand" />
                  ) : null}
                </button>
              </li>
            ))}
            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-[12px] text-ink-soft">
                No matching fonts.
              </li>
            ) : null}
          </ul>
          <p className="px-2 pt-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-soft/50">
            {results.length} verified {results.length === 1 ? "family" : "families"}
            {selected ? ` · current: ${selected.family}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
