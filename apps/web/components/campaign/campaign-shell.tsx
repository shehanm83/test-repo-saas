"use client";

import { useMemo, useState } from "react";
import { Megaphone } from "lucide-react";

import type { BrandLite, ProductLite } from "@/components/generate/commercial/types";

import { BriefScreen } from "./brief/brief-screen";
import { StageRail } from "./stage-rail";
import {
  CAMPAIGN_PLATFORMS,
  recipeMeta,
  toBriefInput,
  type CampaignBriefForm,
  type CampaignStage,
} from "./types";

const STAGE_ORDER: CampaignStage[] = ["brief", "plan", "look", "board", "deliver"];

function formatRange(startsOn: string, endsOn: string): string | null {
  if (!startsOn || !endsOn) return null;
  const start = new Date(`${startsOn}T00:00:00Z`);
  const end = new Date(`${endsOn}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startText = start.toLocaleDateString("en-GB", opts);
  const endText = end.toLocaleDateString("en-GB", { ...opts, year: "numeric" });
  return sameYear ? `${startText} – ${endText}` : `${startText} ${start.getUTCFullYear()} – ${endText}`;
}

/**
 * Holds the campaign's stage state and renders the active screen. Slice 60·A
 * ships Brief; the other four stages are placeholders that the rail already
 * reaches, so each later slice only replaces its own panel.
 */
export function CampaignShell(props: {
  initialForm: CampaignBriefForm;
  brands: BrandLite[];
  products: ProductLite[];
}) {
  const [form, setForm] = useState<CampaignBriefForm>(props.initialForm);
  const [stage, setStage] = useState<CampaignStage>("brief");
  const [furthest, setFurthest] = useState<CampaignStage>("brief");

  const meta = recipeMeta(form.recipe);
  const brandName = props.brands.find((brand) => brand.id === form.brandId)?.name ?? null;
  const platformNames = CAMPAIGN_PLATFORMS.filter((platform) =>
    form.platforms.includes(platform.id),
  ).map((platform) => platform.label);

  const reachable = useMemo(
    () => STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(furthest) + 1),
    [furthest],
  );
  const completed = useMemo(
    () => STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(furthest)),
    [furthest],
  );

  const subtitle = [brandName, formatRange(form.startsOn, form.endsOn), platformNames.join(", ")]
    .filter(Boolean)
    .join(" · ");

  function advanceTo(next: CampaignStage) {
    setStage(next);
    if (STAGE_ORDER.indexOf(next) > STAGE_ORDER.indexOf(furthest)) setFurthest(next);
  }

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <div className="mb-[7px] flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-brand">
            <Megaphone size={11} strokeWidth={2.4} />
            Campaign · {meta.label}
          </div>
          <h1 className="page__title">{form.name.trim() || "New campaign"}</h1>
          <p className="page__sub">{subtitle || "Fill in the brief to get started."}</p>
        </div>
      </div>

      <StageRail
        active={stage}
        completed={completed}
        reachable={reachable}
        onSelect={setStage}
      />

      {stage === "brief" ? (
        <BriefScreen
          form={form}
          brands={props.brands}
          products={props.products}
          onChange={setForm}
          onSubmit={(next) => {
            // 60·A: no backend yet. 60·D replaces this with POST /api/campaigns.
            // eslint-disable-next-line no-console
            console.log("campaign brief", toBriefInput(next));
            advanceTo("plan");
          }}
        />
      ) : (
        <StagePlaceholder stage={stage} />
      )}
    </div>
  );
}

const PLACEHOLDER_COPY: Record<Exclude<CampaignStage, "brief">, { title: string; body: string }> = {
  plan: {
    title: "The plan lands here",
    body: "Phases with dates, and inside each phase a slot with an angle, a format and draft copy — the whole campaign, priced, before a single credit is spent.",
  },
  look: {
    title: "One look, decided once",
    body: "Three or four hero candidates for the campaign's most important slot. Approving one freezes the style contract every other asset is generated against.",
  },
  board: {
    title: "Production board",
    body: "Every slot as a card, grouped by phase, anchored to the approved hero so the board fills in visibly as one campaign.",
  },
  deliver: {
    title: "The campaign, packaged",
    body: "A dated calendar, a per-post copy sheet, and every approved asset named by platform, format and date.",
  },
};

function StagePlaceholder(props: { stage: Exclude<CampaignStage, "brief"> }) {
  const copy = PLACEHOLDER_COPY[props.stage];
  return (
    <div className="card px-8 py-14 text-center">
      <div className="mx-auto max-w-[460px]">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{copy.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{copy.body}</p>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft/60">
          Not built yet
        </p>
      </div>
    </div>
  );
}
