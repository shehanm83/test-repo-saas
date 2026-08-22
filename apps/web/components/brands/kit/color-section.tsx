"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Trash2, Wand2 } from "lucide-react";

import { contrastRatio, isHex, normalizeHex } from "./color";
import { MAX_PALETTE, MIN_PALETTE, PALETTE_ROLES } from "./types";

export function ColorSection(props: {
  palette: string[];
  canExtract: boolean;
  extracting: boolean;
  onChange: (palette: string[]) => void;
  onExtract: () => void;
}) {
  function set(index: number, value: string) {
    const next = [...props.palette];
    next[index] = value;
    props.onChange(next);
  }

  const [primary, , accent] = props.palette;
  // The renderer puts CTA text on the accent over the primary; if that pair is
  // unreadable, every generated image inherits the problem.
  const ctaContrast =
    primary && accent && isHex(primary) && isHex(accent) ? contrastRatio(primary, accent) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        {props.palette.map((color, index) => (
          <ColorSwatch
            key={index}
            color={color}
            index={index}
            removable={props.palette.length > MIN_PALETTE}
            onChange={(value) => set(index, value)}
            onRemove={() => props.onChange(props.palette.filter((_, i) => i !== index))}
          />
        ))}

        {props.palette.length < MAX_PALETTE ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm mb-[30px]"
            onClick={() => props.onChange([...props.palette, "#ffffff"])}
          >
            <Plus size={13} /> Add colour
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={!props.canExtract || props.extracting}
          onClick={props.onExtract}
          title={props.canExtract ? undefined : "Upload a logo first"}
        >
          <Wand2 size={13} /> {props.extracting ? "Reading logo…" : "Extract from logo"}
        </button>

        {ctaContrast !== null && ctaContrast < 3 ? (
          <p className="flex items-center gap-1.5 text-[12px] text-[#b4552c]" role="status">
            <AlertTriangle size={13} />
            Accent on primary is {ctaContrast.toFixed(1)}:1 — CTA text will be hard to read.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ColorSwatch(props: {
  color: string;
  index: number;
  removable: boolean;
  onChange: (color: string) => void;
  onRemove: () => void;
}) {
  const [entry, setEntry] = useState(props.color);
  const role = PALETTE_ROLES[props.index] ?? `Color ${props.index + 1}`;

  useEffect(() => setEntry(props.color), [props.color]);

  function commitEntry() {
    const normalized = normalizeHex(entry);
    if (normalized) props.onChange(normalized);
    setEntry(normalized ?? props.color);
  }

  return (
    <div className="w-[104px]">
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">
          {role}
        </span>
        <input
          type="color"
          className="block h-[76px] w-full cursor-pointer rounded-xl border border-ink/10 bg-white p-1"
          value={normalizeHex(props.color) ?? "#000000"}
          aria-label={`${role} colour`}
          onChange={(event) => props.onChange(event.target.value)}
        />
      </label>
      <div className="mt-1.5 flex items-center gap-1">
        <input
          className="input h-7 w-full px-2 font-mono text-[11.5px] uppercase"
          value={entry}
          aria-label={`${role} hex`}
          onChange={(event) => setEntry(event.target.value)}
          onBlur={commitEntry}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setEntry(props.color);
              event.currentTarget.blur();
            }
          }}
        />
        {props.removable ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm shrink-0 px-1.5"
            aria-label={`Remove ${role}`}
            onClick={props.onRemove}
          >
            <Trash2 size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
