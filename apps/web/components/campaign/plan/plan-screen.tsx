"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarRange,
  Check,
  CircleDot,
  Image as ImageIcon,
  Pencil,
  Plus,
  Target,
  Trash2,
  Users,
  Video,
} from "lucide-react";

import { durationDays, durationLabel, type CampaignBriefForm } from "../types";
import {
  campaignFormat,
  CAMPAIGN_FORMATS,
  deliverableReady,
  type CampaignDeliverable,
  type CampaignObjective,
  type CampaignPlan,
} from "./plan-data";

const LABEL = "font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-ink-soft/70";

const OBJECTIVES: Array<{ id: Exclude<CampaignObjective, "">; label: string; help: string }> = [
  { id: "awareness", label: "Awareness", help: "Reach or recall" },
  { id: "consideration", label: "Consideration", help: "Interest or traffic" },
  { id: "conversion", label: "Conversion", help: "Lead or sale" },
];

export function PlanScreen(props: {
  form: CampaignBriefForm;
  plan: CampaignPlan;
  onChange: (plan: CampaignPlan) => void;
  onApprove: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const deliverables = props.plan.deliverables;
  const timeline = timelineForCampaign(props.form);
  const formats = CAMPAIGN_FORMATS.filter((format) =>
    props.form.platforms.includes(format.platform),
  );
  const stats = useMemo(
    () => planStats(deliverables, timeline.count),
    [deliverables, timeline.count],
  );

  function updateDeliverables(next: CampaignDeliverable[]) {
    props.onChange({ ...props.plan, deliverables: next });
  }

  function patchDeliverable(id: string, patch: Partial<CampaignDeliverable>) {
    updateDeliverables(
      deliverables.map((deliverable) =>
        deliverable.id === id ? { ...deliverable, ...patch } : deliverable,
      ),
    );
  }

  function removeDeliverable(id: string) {
    updateDeliverables(deliverables.filter((deliverable) => deliverable.id !== id));
    setEditingId(null);
  }

  function addDeliverable() {
    const format = formats[0] ?? CAMPAIGN_FORMATS[0]!;
    const id = nextDeliverableId(deliverables);
    updateDeliverables([
      ...deliverables,
      {
        id,
        title: "",
        objective: objectiveFromBrief(props.form.goal),
        audience: props.form.audience,
        message: props.form.brief,
        callToAction: "",
        formatId: format.id,
        campaignSlot: null,
      },
    ]);
    setEditingId(id);
  }

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-brand/10 bg-brand-50 px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
        <b className="text-ink">Keep it simple:</b> define each asset and choose where it belongs in
        the campaign. Production tasks, owners, approvals, and exact dates are handled later.
      </div>

      <CampaignTimeline timeline={timeline} deliverables={deliverables} />

      <div className="grid items-start gap-[22px] min-[1180px]:grid-cols-[1fr_306px]">
        <section className="min-w-0" aria-labelledby="deliverables-heading">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div>
              <h2
                id="deliverables-heading"
                className="font-display text-[18px] font-semibold tracking-tight text-ink"
              >
                Campaign deliverables
              </h2>
              <p className="mt-0.5 max-w-[650px] text-[11.5px] leading-relaxed text-ink-soft/70">
                One card is one finished asset. Its campaign {timeline.unit} shows when it should
                run—nothing more to schedule here.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm ml-auto"
              onClick={addDeliverable}
            >
              <Plus size={12} /> Add deliverable
            </button>
          </div>

          {deliverables.length === 0 ? (
            <button
              type="button"
              className="grid min-h-[230px] w-full place-items-center rounded-2xl border border-dashed border-ink/15 bg-white/50 px-5 py-10 text-center hover:border-brand/30"
              onClick={addDeliverable}
            >
              <span>
                <CalendarRange size={27} className="mx-auto mb-3 text-brand" />
                <b className="block text-sm text-ink">No deliverables defined</b>
                <span className="mt-1 block max-w-[420px] text-[12.5px] leading-relaxed text-ink-soft">
                  Add the real assets this campaign needs and place each one in the campaign.
                </span>
                <span className="btn btn--accent btn--sm mt-4">
                  <Plus size={12} /> Define first deliverable
                </span>
              </span>
            </button>
          ) : (
            <div className="space-y-3">
              {[...deliverables]
                .sort((a, b) => (a.campaignSlot ?? 999) - (b.campaignSlot ?? 999))
                .map((deliverable) => (
                  <DeliverableCard
                    key={deliverable.id}
                    deliverable={deliverable}
                    formats={formats.length > 0 ? formats : CAMPAIGN_FORMATS}
                    timeline={timeline}
                    editing={editingId === deliverable.id}
                    onEdit={() => setEditingId(deliverable.id)}
                    onDone={() => setEditingId(null)}
                    onChange={(patch) => patchDeliverable(deliverable.id, patch)}
                    onRemove={() => removeDeliverable(deliverable.id)}
                  />
                ))}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-3.5 min-[1180px]:sticky min-[1180px]:top-4">
          <RailCard title="Plan readiness">
            <RailRow
              label="Campaign length"
              value={durationLabel(props.form.startsOn, props.form.endsOn) ?? "Not set"}
            />
            <RailRow label="Deliverables" value={String(stats.total)} />
            <RailRow
              label={`Assigned to a ${timeline.unit}`}
              value={`${stats.timed} / ${stats.total}`}
            />
            <RailRow label="Ready" value={`${stats.ready} / ${stats.total}`} />
            {stats.total > 0 && stats.ready === stats.total ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#e9f7ef] px-3 py-2.5 text-[11.5px] leading-[1.45] text-[#24704f]">
                <Check size={13} className="mt-px flex-none" />
                Every deliverable has a purpose, audience, format, and campaign {timeline.unit}.
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn--accent mt-3 w-full"
              disabled={stats.total === 0 || stats.ready !== stats.total}
              onClick={props.onApprove}
            >
              Continue to visual direction <ArrowRight size={14} />
            </button>
          </RailCard>

          <RailCard title="What a card means">
            <p className="text-[11.5px] leading-[1.55] text-ink-soft">
              A card is one asset to create—for example, one Instagram reel or one Facebook post. “
              {slotLabel(timeline, Math.min(2, timeline.count))}” means it belongs in that relative
              part of the campaign. No calendar dates are required.
            </p>
          </RailCard>
        </aside>
      </div>
    </div>
  );
}

function CampaignTimeline(props: {
  timeline: CampaignTimelineDefinition;
  deliverables: CampaignDeliverable[];
}) {
  return (
    <section className="mb-6 rounded-2xl bg-white px-4 py-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div>
          <h2 className={LABEL}>
            Campaign timeline · {props.timeline.durationDays}{" "}
            {props.timeline.durationDays === 1 ? "day" : "days"}
          </h2>
          <p className="mt-1 text-[11px] text-ink-soft/65">
            Deliverables are grouped by campaign {props.timeline.unit}, not exact dates.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-full w-max gap-2">
          {Array.from({ length: props.timeline.count }, (_, index) => {
            const slot = index + 1;
            const items = props.deliverables.filter((item) => item.campaignSlot === slot);
            return (
              <div
                key={slot}
                className={`min-h-[82px] w-[150px] flex-1 rounded-xl border px-3 py-2.5 ${
                  items.length ? "border-brand/20 bg-brand-50" : "border-ink/8 bg-ink/[0.025]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>
                    <b className="block text-[12px] text-ink">{slotLabel(props.timeline, slot)}</b>
                    {props.timeline.unit === "week" ? (
                      <small className="block text-[9px] text-ink-soft/55">
                        {weekDayRange(props.timeline, slot)}
                      </small>
                    ) : null}
                  </span>
                  <span className="ml-auto font-mono text-[9px] text-ink-soft/55">
                    {items.length} {items.length === 1 ? "asset" : "assets"}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="truncate rounded-md bg-white px-2 py-1 text-[10.5px] text-ink-soft"
                    >
                      {item.title || "Untitled deliverable"}
                    </div>
                  ))}
                  {items.length > 3 ? (
                    <span className="block text-[9.5px] text-brand">+{items.length - 3} more</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DeliverableCard(props: {
  deliverable: CampaignDeliverable;
  formats: typeof CAMPAIGN_FORMATS;
  timeline: CampaignTimelineDefinition;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onChange: (patch: Partial<CampaignDeliverable>) => void;
  onRemove: () => void;
}) {
  const format = campaignFormat(props.deliverable.formatId);

  if (props.editing) {
    return (
      <article className="rounded-2xl bg-white p-4 shadow-float ring-2 ring-brand/25">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-ink/8 pb-3">
          <div>
            <span className={LABEL}>Define deliverable</span>
            <p className="mt-1 text-[11px] text-ink-soft/65">Fields marked * are required.</p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm ml-auto"
            disabled={!deliverableReady(props.deliverable, props.timeline.count)}
            onClick={props.onDone}
          >
            <Check size={12} /> Save deliverable
          </button>
        </div>

        <div className="grid gap-x-4 min-[760px]:grid-cols-2">
          <EditorField label="Deliverable name *" help="The asset you want to create">
            <input
              className="input"
              value={props.deliverable.title}
              aria-label="Deliverable name"
              placeholder="e.g. Product demo reel"
              onChange={(event) => props.onChange({ title: event.target.value })}
            />
          </EditorField>
          <EditorField label="Business objective *" help="The result this asset should support">
            <select
              className="select"
              value={props.deliverable.objective}
              aria-label="Business objective"
              onChange={(event) =>
                props.onChange({ objective: event.target.value as CampaignObjective })
              }
            >
              <option value="">Choose objective…</option>
              {OBJECTIVES.map((objective) => (
                <option key={objective.id} value={objective.id}>
                  {objective.label} — {objective.help}
                </option>
              ))}
            </select>
          </EditorField>
          <EditorField label="Audience *" help="Who this asset is for">
            <input
              className="input"
              value={props.deliverable.audience}
              aria-label="Deliverable audience"
              placeholder="Specific customer segment"
              onChange={(event) => props.onChange({ audience: event.target.value })}
            />
          </EditorField>
          <EditorField label="Call to action" help="What should the audience do next?">
            <input
              className="input"
              value={props.deliverable.callToAction}
              aria-label="Call to action"
              placeholder="e.g. Shop now or learn more"
              onChange={(event) => props.onChange({ callToAction: event.target.value })}
            />
          </EditorField>
          <div className="min-[760px]:col-span-2">
            <EditorField
              label="Key message *"
              help="The one takeaway this asset should communicate"
            >
              <textarea
                className="textarea min-h-[86px] resize-y"
                value={props.deliverable.message}
                aria-label="Key message"
                placeholder="What should the audience remember?"
                onChange={(event) => props.onChange({ message: event.target.value })}
              />
            </EditorField>
          </div>
          <EditorField label="Channel and format *" help="Where this asset will run">
            <select
              className="select"
              value={props.deliverable.formatId}
              aria-label="Channel and format"
              onChange={(event) => props.onChange({ formatId: event.target.value })}
            >
              {props.formats.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label} · {entry.aspectRatio}
                </option>
              ))}
            </select>
          </EditorField>
          <EditorField
            label={`Campaign ${props.timeline.unit} *`}
            help="When this asset belongs in the campaign"
          >
            <select
              className="select"
              value={props.deliverable.campaignSlot ?? ""}
              aria-label={`Campaign ${props.timeline.unit}`}
              onChange={(event) =>
                props.onChange({
                  campaignSlot: event.target.value ? Number(event.target.value) : null,
                })
              }
            >
              <option value="">Choose {props.timeline.unit}…</option>
              {Array.from({ length: props.timeline.count }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {slotLabel(props.timeline, index + 1)}
                  {props.timeline.unit === "week"
                    ? ` · ${weekDayRange(props.timeline, index + 1)}`
                    : ""}
                </option>
              ))}
            </select>
          </EditorField>
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#b93830] hover:underline"
          onClick={props.onRemove}
        >
          <Trash2 size={12} /> Remove deliverable
        </button>
      </article>
    );
  }

  return (
    <article className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start gap-2.5">
        <span
          className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${
            format.kind === "video" ? "bg-[#fff0e8] text-[#b4532a]" : "bg-brand-50 text-brand"
          }`}
        >
          {format.kind === "video" ? <Video size={16} /> : <ImageIcon size={16} />}
        </span>
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold leading-tight text-ink">
            {props.deliverable.title || "Untitled deliverable"}
          </h3>
          <p className="mt-1 text-[11px] text-ink-soft/65">
            {format.label} · {format.aspectRatio} ·{" "}
            {props.deliverable.campaignSlot
              ? slotLabel(props.timeline, props.deliverable.campaignSlot)
              : "Timing not set"}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm ml-auto"
          aria-label={`Edit ${props.deliverable.title || "deliverable"}`}
          onClick={props.onEdit}
        >
          <Pencil size={12} /> Edit
        </button>
      </div>

      <div className="mt-3 grid gap-3 border-t border-ink/8 pt-3 sm:grid-cols-3">
        <SummaryField icon={<Target size={12} />} label="Why">
          {objectiveLabel(props.deliverable.objective)}
        </SummaryField>
        <SummaryField icon={<Users size={12} />} label="Who">
          {props.deliverable.audience || "Not set"}
        </SummaryField>
        <SummaryField icon={<CircleDot size={12} />} label="What">
          {props.deliverable.message || "Not set"}
          {props.deliverable.callToAction ? (
            <small className="mt-1 block text-[10px] text-brand">
              CTA: {props.deliverable.callToAction}
            </small>
          ) : null}
        </SummaryField>
      </div>
    </article>
  );
}

function EditorField(props: { label: string; help: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[11.5px] font-semibold text-ink">{props.label}</span>
      <span className="mb-2 block text-[10.5px] text-ink-soft/60">{props.help}</span>
      {props.children}
    </label>
  );
}

function SummaryField(props: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-soft/60">
        {props.icon} {props.label}
      </span>
      <div className="text-[11.5px] leading-[1.45] text-ink-soft">{props.children}</div>
    </div>
  );
}

function RailCard(props: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white px-4 py-4 shadow-card">
      <h2 className={`mb-3 ${LABEL}`}>{props.title}</h2>
      {props.children}
    </section>
  );
}

function RailRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-[12.5px]">
      <span className="text-ink-soft">{props.label}</span>
      <span className="ml-auto font-mono text-[11.5px] tabular-nums">{props.value}</span>
    </div>
  );
}

function planStats(deliverables: CampaignDeliverable[], slotCount: number) {
  return {
    total: deliverables.length,
    timed: deliverables.filter((item) => item.campaignSlot !== null).length,
    ready: deliverables.filter((item) => deliverableReady(item, slotCount)).length,
  };
}

interface CampaignTimelineDefinition {
  durationDays: number;
  unit: "day" | "week";
  count: number;
}

function timelineForCampaign(form: CampaignBriefForm): CampaignTimelineDefinition {
  const days = Math.max(1, durationDays(form.startsOn, form.endsOn) ?? 1);
  return days <= 14
    ? { durationDays: days, unit: "day", count: days }
    : { durationDays: days, unit: "week", count: Math.ceil(days / 7) };
}

function slotLabel(timeline: CampaignTimelineDefinition, slot: number): string {
  const label = timeline.unit === "day" ? "Day" : "Week";
  return `${label} ${slot}`;
}

function weekDayRange(timeline: CampaignTimelineDefinition, week: number): string {
  const first = (week - 1) * 7 + 1;
  const last = Math.min(week * 7, timeline.durationDays);
  return first === last ? `Day ${first}` : `Days ${first}–${last}`;
}

function objectiveFromBrief(goal: string): CampaignObjective {
  const value = goal.toLowerCase();
  if (value === "awareness" || value.includes("reach") || value.includes("recall"))
    return "awareness";
  if (value === "consideration" || value.includes("traffic") || value.includes("engagement")) {
    return "consideration";
  }
  if (value === "conversion" || value.includes("sale") || value.includes("lead"))
    return "conversion";
  return "";
}

function objectiveLabel(value: CampaignObjective): string {
  return OBJECTIVES.find((entry) => entry.id === value)?.label ?? "Not set";
}

function nextDeliverableId(deliverables: CampaignDeliverable[]): string {
  const ids = new Set(deliverables.map((item) => item.id));
  let index = ids.size + 1;
  while (ids.has(`deliverable-${index}`)) index += 1;
  return `deliverable-${index}`;
}
