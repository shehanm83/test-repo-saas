"use client";

import { useEffect, useState } from "react";
import { Check, Star, Trash2 } from "lucide-react";

import { DropZone } from "./drop-zone";
import type { UploadProgress } from "./drop-zone";
import {
  LOGO_BACKGROUND_LABELS,
  LOGO_VARIANT_LABELS,
  MAX_LOGOS,
  type BrandKitAsset,
  type LogoBackground,
  type LogoVariant,
} from "./types";

/**
 * Logos, described. The renderer composites exactly one logo per image, so each
 * upload says what shape it is and which artwork it stays legible on, and one is
 * marked primary.
 */
export function LogoSection(props: {
  logos: BrandKitAsset[];
  busy: boolean;
  progress: UploadProgress[];
  onFiles: (files: File[]) => void;
  onDescribe: (
    id: string,
    patch: {
      variant?: LogoVariant;
      background?: LogoBackground;
      label?: string | null;
      isPrimary?: true;
    },
  ) => void;
  onRemove: (id: string) => void;
}) {
  const full = props.logos.length >= MAX_LOGOS;

  return (
    <div>
      <DropZone
        label="Drop a logo, or browse"
        hint={`SVG keeps its edges at any size · PNG, JPG and WebP work too · up to ${MAX_LOGOS} files`}
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        multiple
        disabled={full}
        busy={props.busy}
        progress={props.progress}
        onFiles={(files) => props.onFiles(files.slice(0, MAX_LOGOS - props.logos.length))}
      >
        {full ? (
          <span className="text-[11.5px] text-ink-soft/70">Remove one to add another.</span>
        ) : null}
      </DropZone>

      {props.logos.length > 0 ? (
        <ul className="mt-4 grid gap-3 min-[900px]:grid-cols-2">
          {props.logos.map((logo) => (
            <LogoCard
              key={logo.id}
              logo={logo}
              onDescribe={props.onDescribe}
              onRemove={props.onRemove}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LogoCard(props: {
  logo: BrandKitAsset;
  onDescribe: LogoSectionProps["onDescribe"];
  onRemove: LogoSectionProps["onRemove"];
}) {
  const { logo } = props;
  const [label, setLabel] = useState(logo.label ?? "");

  useEffect(() => setLabel(logo.label ?? ""), [logo.label]);

  return (
    <li className="rounded-2xl bg-white p-3.5 shadow-card">
      <div className="flex gap-3">
        <div className="grid shrink-0 gap-1.5">
          <Swatch url={logo.url} tone="light" />
          <Swatch url={logo.url} tone="dark" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <input
              className="input h-8 min-w-0 flex-1 text-[13px]"
              value={label}
              placeholder="Name this logo"
              aria-label="Logo name"
              onChange={(event) => setLabel(event.target.value)}
              onBlur={() => {
                if (label !== (logo.label ?? "")) {
                  props.onDescribe(logo.id, { label: label || null });
                }
              }}
            />
            <button
              type="button"
              className="btn btn--ghost btn--sm shrink-0"
              aria-label="Delete logo"
              onClick={() => props.onRemove(logo.id)}
            >
              <Trash2 size={13} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              className="select h-8 text-[12.5px]"
              aria-label="Logo shape"
              value={logo.variant}
              onChange={(event) =>
                props.onDescribe(logo.id, { variant: event.target.value as LogoVariant })
              }
            >
              {Object.entries(LOGO_VARIANT_LABELS).map(([value, optionLabel]) => (
                <option key={value} value={value}>
                  {optionLabel}
                </option>
              ))}
            </select>
            <select
              className="select h-8 text-[12.5px]"
              aria-label="Artwork this logo suits"
              value={logo.background}
              onChange={(event) =>
                props.onDescribe(logo.id, {
                  background: event.target.value as LogoBackground,
                })
              }
            >
              {Object.entries(LOGO_BACKGROUND_LABELS).map(([value, optionLabel]) => (
                <option key={value} value={value}>
                  {optionLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            {logo.isPrimary ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-brand-700">
                <Check size={10} strokeWidth={3} /> Primary
              </span>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft/80 hover:bg-cream-deep hover:text-ink"
                onClick={() => props.onDescribe(logo.id, { isPrimary: true })}
              >
                <Star size={10} /> Make primary
              </button>
            )}
            <span className="font-mono text-[10.5px] text-ink-soft/60">
              {logo.width && logo.height ? `${logo.width}×${logo.height}` : "size unknown"}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

type LogoSectionProps = Parameters<typeof LogoSection>[0];

/** A logo has to survive both grounds — showing one is how wrong variants hide. */
function Swatch(props: { url: string | null; tone: "light" | "dark" }) {
  return (
    <div
      className={`grid h-[52px] w-[68px] place-items-center rounded-lg ${
        props.tone === "light" ? "checker" : "bg-ink-deep"
      }`}
      title={props.tone === "light" ? "On light artwork" : "On dark artwork"}
    >
      {props.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.url} alt="" className="max-h-9 max-w-[56px] object-contain" />
      ) : null}
    </div>
  );
}
