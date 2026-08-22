"use client";

import { Check, Info } from "lucide-react";

import { SampleDesign } from "./sample-design";
import { checklist, type BrandKitAsset, type BrandKitDraft } from "./types";

/**
 * What the kit looks like and what it still owes the generator. Missing items
 * are phrased as consequences — a checklist that only scolds gets ignored.
 */
export function BrandRail(props: {
  draft: BrandKitDraft;
  assets: BrandKitAsset[];
  generationCount?: number;
}) {
  const items = checklist(props.draft, props.assets);
  const done = items.filter((item) => item.done).length;
  const primaryLogo =
    props.assets.find((asset) => asset.kind === "logo" && asset.isPrimary) ??
    props.assets.find((asset) => asset.kind === "logo");

  return (
    <aside className="grid gap-4 min-[1180px]:sticky min-[1180px]:top-6">
      <SampleDesign
        palette={props.draft.palette}
        fonts={props.draft.fonts}
        logoUrl={primaryLogo?.url ?? null}
        compact
      />

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">
            Kit readiness
          </p>
          <p className="font-mono text-[11px] text-ink-soft">
            {done}/{items.length}
          </p>
        </div>

        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.label} className="flex gap-2">
              <span
                className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                  item.done ? "bg-brand text-white" : "bg-cream-deep text-transparent"
                }`}
              >
                <Check size={10} strokeWidth={3} />
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[12.5px] ${item.done ? "text-ink-soft/70" : "text-ink"}`}
                >
                  {item.label}
                </span>
                {item.done ? null : (
                  <span className="block text-[11.5px] leading-snug text-ink-soft/70">
                    {item.consequence}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex gap-2 rounded-2xl bg-cream-deep/70 p-3.5 text-[11.5px] leading-relaxed text-ink-soft">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          Your logo, fonts and palette are placed by the renderer, never generated. The model only
          ever paints around them.
          {props.generationCount ? ` Used in ${props.generationCount} generations.` : ""}
        </span>
      </p>
    </aside>
  );
}
