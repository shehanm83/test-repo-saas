"use client";

import { Check } from "lucide-react";

import type { Platform } from "@layertone/shared/output-targets";

import { CAMPAIGN_PLATFORMS } from "../types";

export function PlatformToggles(props: {
  value: Platform[];
  onChange: (platforms: Platform[]) => void;
}) {
  const selected = new Set(props.value);

  function toggle(platform: Platform) {
    const next = new Set(selected);
    if (next.has(platform)) next.delete(platform);
    else next.add(platform);
    props.onChange(CAMPAIGN_PLATFORMS.filter((p) => next.has(p.id)).map((p) => p.id));
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Where it runs">
      {CAMPAIGN_PLATFORMS.map((platform) => {
        const on = selected.has(platform.id);
        return (
          <button
            key={platform.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(platform.id)}
            className={`flex items-center gap-[7px] rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 ${
              on
                ? "bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1.5px_var(--color-brand)]"
                : "text-ink-soft shadow-[inset_0_0_0_1px_rgba(17,17,17,0.1)] hover:bg-ink/3"
            }`}
          >
            <span
              className={`grid h-[15px] w-[15px] flex-none place-items-center rounded-full ${
                on ? "bg-brand text-white" : "bg-ink/10 text-transparent"
              }`}
            >
              <Check size={8} strokeWidth={4} />
            </span>
            {platform.label}
          </button>
        );
      })}
    </div>
  );
}
