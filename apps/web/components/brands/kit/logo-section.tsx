"use client";

import { useEffect, useState } from "react";
import { Check, Star, Trash2, X, ZoomIn } from "lucide-react";

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
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => setLabel(logo.label ?? ""), [logo.label]);

  useEffect(() => {
    if (!previewOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewOpen]);

  return (
    <li className="rounded-2xl bg-white p-3.5 shadow-card">
      <div className="grid grid-cols-2 gap-2">
        <Swatch
          url={logo.url}
          tone="light"
          label={logo.label}
          onMagnify={() => setPreviewOpen(true)}
        />
        <Swatch
          url={logo.url}
          tone="dark"
          label={logo.label}
          onMagnify={() => setPreviewOpen(true)}
        />
      </div>

      <div className="mt-3 min-w-0">
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

      {previewOpen && logo.url ? (
        <LogoPreviewDialog logo={logo} onClose={() => setPreviewOpen(false)} />
      ) : null}
    </li>
  );
}

type LogoSectionProps = Parameters<typeof LogoSection>[0];

/** A logo has to survive both grounds — showing one is how wrong variants hide. */
function Swatch(props: {
  url: string | null;
  tone: "light" | "dark";
  label: string | null;
  onMagnify: () => void;
}) {
  const backgroundLabel = props.tone === "light" ? "light" : "dark";
  const className = `logo-magnify group relative grid h-28 w-full place-items-center overflow-hidden rounded-xl border border-ink/5 p-4 ${
    props.tone === "light" ? "checker" : "bg-ink-deep"
  }`;

  if (!props.url) {
    return <div className={className} aria-label={`Logo preview on ${backgroundLabel} artwork`} />;
  }

  return (
    <button
      type="button"
      className={`${className} cursor-zoom-in transition hover:border-brand-500/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2`}
      aria-label={`Magnify ${props.label || "logo"} on ${backgroundLabel} artwork`}
      title={`View larger on ${backgroundLabel} artwork`}
      onClick={props.onMagnify}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={props.url} alt="" className="max-h-20 max-w-full object-contain" />
      <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-ink shadow-sm transition group-hover:scale-105">
        <ZoomIn size={14} aria-hidden="true" />
      </span>
    </button>
  );
}

function LogoPreviewDialog(props: { logo: BrandKitAsset; onClose: () => void }) {
  const name = props.logo.label || "Logo";

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-ink-deep/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${name} preview`}
        className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-ink">{name}</h3>
            <p className="font-mono text-[11px] text-ink-soft/70">
              {props.logo.width && props.logo.height
                ? `${props.logo.width}×${props.logo.height}`
                : "Full-size preview"}
            </p>
          </div>
          <button
            type="button"
            autoFocus
            className="btn btn--ghost grid size-9 shrink-0 place-items-center p-0"
            aria-label="Close logo preview"
            onClick={props.onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {(["light", "dark"] as const).map((tone) => (
            <div
              key={tone}
              className={`grid min-h-[260px] place-items-center rounded-xl p-8 sm:min-h-[340px] ${
                tone === "light" ? "checker" : "bg-ink-deep"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={props.logo.url ?? undefined}
                alt={`${name} on ${tone} artwork`}
                className="max-h-[50vh] max-w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
