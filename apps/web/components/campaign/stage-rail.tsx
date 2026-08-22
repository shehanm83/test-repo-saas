"use client";

import { Check } from "lucide-react";

import type { CampaignStage } from "./types";

const STAGES: Array<{ id: CampaignStage; label: string; separatorAfter?: boolean }> = [
  { id: "brief", label: "Brief" },
  { id: "plan", label: "Plan", separatorAfter: true },
  { id: "look", label: "Look" },
  { id: "board", label: "Board", separatorAfter: true },
  { id: "deliver", label: "Deliver" },
];

export function StageRail(props: {
  active: CampaignStage;
  /** Stages already signed off — they get a tick and stay clickable. */
  completed: CampaignStage[];
  /** Stages the campaign has reached. Anything else is not navigable yet. */
  reachable: CampaignStage[];
  onSelect: (stage: CampaignStage) => void;
}) {
  const completed = new Set(props.completed);
  const reachable = new Set(props.reachable);

  return (
    <nav
      className="mb-6 flex items-stretch overflow-x-auto rounded-2xl bg-white p-[5px] shadow-card"
      aria-label="Campaign stages"
    >
      {STAGES.map((stage, index) => {
        const isActive = stage.id === props.active;
        const isDone = completed.has(stage.id) && !isActive;
        const isReachable = reachable.has(stage.id);

        return (
          <div key={stage.id} className="flex flex-none items-stretch">
            <button
              type="button"
              aria-current={isActive ? "step" : undefined}
              disabled={!isReachable}
              onClick={() => props.onSelect(stage.id)}
              className={`flex flex-none items-center gap-2.5 whitespace-nowrap rounded-xl px-[15px] py-2.5 text-[13.5px] font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-ink-deep text-white shadow-pill-dark"
                  : isReachable
                    ? "text-ink-soft hover:bg-ink/4"
                    : "cursor-not-allowed text-ink-soft/40"
              }`}
            >
              <span
                className={`grid h-[19px] w-[19px] flex-none place-items-center rounded-full font-mono text-[10px] font-medium ${
                  isActive
                    ? "bg-white/20 text-white"
                    : isDone
                      ? "bg-[#e6f4ed] text-[#1f8a5b]"
                      : "bg-ink/7 text-ink-soft"
                }`}
              >
                {isDone ? <Check size={10} strokeWidth={3.4} /> : index + 1}
              </span>
              {stage.label}
            </button>
            {stage.separatorAfter ? (
              <div className="my-[9px] mx-[3px] w-px flex-none bg-ink/10" aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
