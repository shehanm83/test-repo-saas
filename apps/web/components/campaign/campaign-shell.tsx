"use client";

import { useMemo, useState } from "react";
import { Megaphone } from "lucide-react";

import type { BrandLite, ProductLite } from "@/components/generate/commercial/types";

import { BriefScreen } from "./brief/brief-screen";
import { createEmptyCampaignPlan, type CampaignPlan } from "./plan/plan-data";
import { PlanScreen } from "./plan/plan-screen";
import { StageRail } from "./stage-rail";
import {
  CAMPAIGN_PLATFORMS,
  durationLabel,
  recipeMeta,
  type CampaignBriefForm,
  type CampaignStage,
} from "./types";

const STAGE_ORDER: CampaignStage[] = ["brief", "plan", "look", "board", "deliver"];

/**
 * Holds the campaign's frontend stage state and renders the active screen.
 * Brief and deliverables work locally until campaign persistence is introduced.
 */
export function CampaignShell(props: {
  initialForm: CampaignBriefForm;
  brands: BrandLite[];
  products: ProductLite[];
}) {
  const [form, setForm] = useState<CampaignBriefForm>(props.initialForm);
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
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
  const completed = useMemo(() => STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(furthest)), [furthest]);

  const subtitle = [brandName, durationLabel(form.startsOn, form.endsOn), platformNames.join(", ")]
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

      <StageRail active={stage} completed={completed} reachable={reachable} onSelect={setStage} />

      {stage === "brief" ? (
        <BriefScreen
          form={form}
          brands={props.brands}
          products={props.products}
          onChange={setForm}
          onSubmit={(next) => {
            setForm(next);
            setPlan(createEmptyCampaignPlan(next));
            advanceTo("plan");
          }}
        />
      ) : stage === "plan" && plan ? (
        <PlanScreen
          form={form}
          plan={plan}
          onChange={setPlan}
          onApprove={() => advanceTo("look")}
        />
      ) : (
        <StagePlaceholder stage={stage} />
      )}
    </div>
  );
}

const PLACEHOLDER_COPY: Record<Exclude<CampaignStage, "brief">, { title: string; body: string }> = {
  plan: {
    title: "Define campaign deliverables",
    body: "Name each asset, its job, audience, channel, and where it belongs in the campaign timeline.",
  },
  look: {
    title: "One look, decided once",
    body: "Three or four hero candidates for the campaign's most important slot. Approving one freezes the style contract every other asset is generated against.",
  },
  board: {
    title: "Production board",
    body: "Every deliverable moves through copy, design, review, approval, scheduling, and publication with a visible owner and status.",
  },
  deliver: {
    title: "The campaign, packaged",
    body: "A campaign timeline, a per-post copy sheet, and every approved asset named by platform and format.",
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
