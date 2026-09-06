"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Lock } from "lucide-react";

import type { BrandLite, ProductLite } from "@/components/generate/commercial/types";

import {
  durationLabel,
  recipeMeta,
  validateBrief,
  type BriefValidation,
  type CampaignBriefForm,
} from "../types";
import { OfferFields } from "./offer-fields";
import { PlatformToggles } from "./platform-toggles";
import { ProductChips } from "./product-chips";
import { RecipePicker } from "./recipe-picker";

const LABEL = "mb-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft/70";

function Field(props: { label: ReactNode; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="mb-[22px]">
      <p className={LABEL}>{props.label}</p>
      {props.children}
      {props.error ? (
        <p className="mt-2 text-[12px] text-[#c2362c]" role="status">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}

export function BriefScreen(props: {
  form: CampaignBriefForm;
  brands: BrandLite[];
  products: ProductLite[];
  onChange: (form: CampaignBriefForm) => void;
  onSubmit: (form: CampaignBriefForm) => void;
}) {
  const { form } = props;
  const [touched, setTouched] = useState<ReadonlySet<ErrorKey>>(new Set());
  const [campaignLengthDraft, setCampaignLengthDraft] = useState(() =>
    String(campaignLengthAmount(form.startsOn, form.endsOn)),
  );
  const [campaignLengthUnitDraft, setCampaignLengthUnitDraft] = useState<CampaignLengthUnit>(() =>
    campaignLengthUnit(form.startsOn, form.endsOn),
  );
  const meta = recipeMeta(form.recipe);
  const validation = useMemo(() => validateBrief(form), [form]);
  const duration = durationLabel(form.startsOn, form.endsOn);
  const brand = props.brands.find((entry) => entry.id === form.brandId) ?? null;
  const brandLogo = brand?.logoAssets?.find((asset) => asset.url)?.url ?? null;
  const brandProducts = props.products.filter(
    (product) => !form.brandId || product.brandId === null || product.brandId === form.brandId,
  );

  /** Errors stay quiet until the user has been near the field. */
  function errorFor(key: ErrorKey): string | undefined {
    return touched.has(key) ? validation.errors[key] : undefined;
  }

  function patch(next: Partial<CampaignBriefForm>) {
    const keys = Object.keys(next).map(errorKeyFor);
    setTouched((current) => new Set([...current, ...keys]));
    props.onChange({ ...form, ...next });
  }

  return (
    <div className="grid items-start gap-[22px] min-[1180px]:grid-cols-[1fr_306px]">
      <div>
        <Field label="Campaign name" error={errorFor("name")}>
          <input
            className="input"
            value={form.name}
            placeholder="Cold Brew Season"
            aria-label="Campaign name"
            onChange={(event) => patch({ name: event.target.value })}
          />
        </Field>

        <Field label="What are you doing?">
          <RecipePicker value={form.recipe} onChange={(recipe) => patch({ recipe })} />
        </Field>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Business objective" error={errorFor("goal")}>
            <select
              className="select"
              value={form.goal}
              aria-label="Business objective"
              onChange={(event) => patch({ goal: event.target.value })}
            >
              <option value="">Choose the result…</option>
              <option value="awareness">Awareness — reach or recall</option>
              <option value="consideration">Consideration — interest or traffic</option>
              <option value="conversion">Conversion — lead or sale</option>
            </select>
          </Field>
          <Field label="Target audience" error={errorFor("audience")}>
            <input
              className="input"
              value={form.audience}
              aria-label="Target audience"
              placeholder="e.g. Home coffee drinkers in Stockholm"
              onChange={(event) => patch({ audience: event.target.value })}
            />
          </Field>
        </div>

        <Field label="Brand" error={errorFor("brandId")}>
          <select
            className="select max-w-[360px]"
            value={form.brandId}
            aria-label="Brand"
            disabled={props.brands.length === 0}
            onChange={(event) => patch({ brandId: event.target.value })}
          >
            <option value="">
              {props.brands.length === 0 ? "No brands in this workspace" : "Choose a brand…"}
            </option>
            {props.brands.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={
            meta.productOptional ? (
              <>
                Products{" "}
                <span className="font-sans text-[11px] normal-case tracking-normal">
                  — optional for always-on
                </span>
              </>
            ) : (
              "Products"
            )
          }
          error={errorFor("productRefs")}
        >
          <ProductChips
            brandId={form.brandId}
            products={brandProducts}
            selected={form.productRefs}
            onChange={(productRefs) => patch({ productRefs })}
          />
        </Field>

        <Field label="Where it runs" error={errorFor("platforms")}>
          <PlatformToggles value={form.platforms} onChange={(platforms) => patch({ platforms })} />
        </Field>

        <Field label="Campaign length" error={errorFor("dates")}>
          <div className="grid max-w-[360px] grid-cols-[1fr_150px] gap-2">
            <input
              type="number"
              min="1"
              max={campaignLengthUnitDraft === "weeks" ? "52" : "365"}
              className="input"
              value={campaignLengthDraft}
              aria-label="Campaign duration"
              onChange={(event) => {
                const value = event.target.value;
                setCampaignLengthDraft(value);
                const amount = Number(value);
                if (value !== "" && Number.isInteger(amount) && amount >= 1) {
                  patch(relativeCampaignRange(amount, campaignLengthUnitDraft));
                }
              }}
              onBlur={() => {
                const limit = campaignLengthUnitDraft === "weeks" ? 52 : 365;
                const amount = Math.min(limit, Math.max(1, Number(campaignLengthDraft) || 1));
                setCampaignLengthDraft(String(amount));
                patch(relativeCampaignRange(amount, campaignLengthUnitDraft));
              }}
            />
            <select
              className="select"
              value={campaignLengthUnitDraft}
              aria-label="Campaign duration unit"
              onChange={(event) => {
                const unit = event.target.value as CampaignLengthUnit;
                const limit = unit === "weeks" ? 52 : 365;
                const amount = Math.min(limit, Math.max(1, Number(campaignLengthDraft) || 1));
                setCampaignLengthUnitDraft(unit);
                setCampaignLengthDraft(String(amount));
                patch(relativeCampaignRange(amount, unit));
              }}
            >
              <option value="days">Day(s)</option>
              <option value="weeks">Week(s)</option>
            </select>
          </div>
          <p className="mt-2 text-[11.5px] text-ink-soft/65">
            Use one day for a one-off campaign, or enter any number of days or weeks.
          </p>
        </Field>

        <Field label="What's the campaign about?" error={errorFor("brief")}>
          <textarea
            className="textarea min-h-[104px] resize-y leading-[1.6]"
            value={form.brief}
            aria-label="Campaign brief"
            placeholder="One to three sentences. What you're doing, why now, and the tone you want."
            onChange={(event) => patch({ brief: event.target.value })}
          />
        </Field>

        {meta.usesOffer ? (
          <Field
            label={
              <>
                Offer{" "}
                <span className="font-sans text-[11px] normal-case tracking-normal">
                  — optional, drives price and badge overlays
                </span>
              </>
            }
          >
            <OfferFields value={form.offer} onChange={(offer) => patch({ offer })} />
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn--accent h-[42px] px-[22px] text-[15px]"
            disabled={!validation.valid}
            onClick={() => props.onSubmit(form)}
          >
            Continue to deliverables
            <ArrowRight size={15} strokeWidth={2} />
          </button>
          {validation.blockingReason ? (
            <span className="text-[12.5px] text-ink-soft" role="status">
              {validation.blockingReason}
            </span>
          ) : null}
        </div>
      </div>

      <aside className="flex flex-col gap-3.5 min-[1180px]:sticky min-[1180px]:top-0">
        <div className="rounded-2xl bg-white px-4 py-4 shadow-card">
          <h5 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-ink-soft/70">
            Brand
          </h5>
          {brand ? (
            <>
              <div className="checker mb-3 grid min-h-[92px] place-items-center overflow-hidden rounded-xl border border-ink/5 p-3">
                {brandLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brandLogo}
                    alt={`${brand.name} logo`}
                    className="max-h-16 max-w-[88%] object-contain"
                  />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink-deep font-display text-lg font-bold text-white">
                    {brand.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="mb-3 leading-tight">
                <b className="text-[13.5px]">{brand.name}</b>
                <br />
                <span className="text-[11.5px] text-ink-soft/70">
                  {brand.palette?.length ? `${brand.palette.length} colours` : "No palette saved"}
                </span>
              </div>

              {brand.palette?.length ? (
                <div className="flex gap-1.5" aria-label={`${brand.name} palette`}>
                  {brand.palette.slice(0, 6).map((color, index) => (
                    <span
                      key={`${color}-${index}`}
                      className="h-[26px] flex-1 rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)]"
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
              ) : null}

              {brand.fonts ? (
                <dl className="mt-3 grid gap-1.5 border-t border-ink/10 pt-3 text-[11.5px]">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-soft/70">Headline</dt>
                    <dd className="truncate font-medium text-ink">{brand.fonts.heading.family}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-soft/70">Body</dt>
                    <dd className="truncate font-medium text-ink">{brand.fonts.body.family}</dd>
                  </div>
                </dl>
              ) : null}
            </>
          ) : (
            <div className="text-[12.5px] leading-relaxed text-ink-soft">
              {props.brands.length === 0 ? (
                <>
                  No brand kits exist in this workspace yet.{" "}
                  <Link href="/brands/new" className="font-medium text-brand hover:underline">
                    Create a brand
                  </Link>
                  .
                </>
              ) : (
                "Pick a brand and its palette, fonts and logo lock to the campaign."
              )}
            </div>
          )}
          <div className="mt-3 flex items-start gap-[7px] rounded-xl bg-brand-50 px-3 py-2.5 text-[11.5px] font-medium leading-[1.5] text-brand-700">
            <Lock size={12} strokeWidth={2.2} className="mt-px flex-none" />
            Logo, fonts and palette are placed by the renderer — never generated.
          </div>
        </div>

        <div className="rounded-2xl bg-white px-4 py-4 shadow-card">
          <h5 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-ink-soft/70">
            Planning inputs
          </h5>
          <RailRow k="Products selected" v={String(form.productRefs.length)} />
          <RailRow k="Platforms" v={String(form.platforms.length)} />
          <RailRow k="Campaign length" v={duration ?? "Set dates"} />
          <RailRow k="Objective" v={form.goal || "Not set"} />
          <RailRow k="Audience" v={form.audience ? "Defined" : "Not set"} />
          <p className="mt-2.5 text-[11.5px] leading-[1.5] text-ink-soft/70">
            The next screen turns this brief into named deliverables assigned to relative campaign
            days or weeks. It starts empty and invents nothing.
          </p>
        </div>
      </aside>
    </div>
  );
}

type ErrorKey = keyof BriefValidation["errors"];

const ERROR_KEY_BY_FIELD: Partial<Record<keyof CampaignBriefForm, ErrorKey>> = {
  startsOn: "dates",
  endsOn: "dates",
};

function errorKeyFor(field: string): ErrorKey {
  return ERROR_KEY_BY_FIELD[field as keyof CampaignBriefForm] ?? (field as ErrorKey);
}

function RailRow(props: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-[12.5px]">
      <span className="text-ink-soft">{props.k}</span>
      <span className="ml-auto font-mono text-[11.5px] tabular-nums">{props.v}</span>
    </div>
  );
}

type CampaignLengthUnit = "days" | "weeks";

function campaignLengthDays(startsOn: string, endsOn: string): number {
  const start = Date.parse(`${startsOn}T00:00:00Z`);
  const end = Date.parse(`${endsOn}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.round((end - start) / 86_400_000) + 1;
}

function campaignLengthUnit(startsOn: string, endsOn: string): CampaignLengthUnit {
  const days = campaignLengthDays(startsOn, endsOn);
  return days >= 7 && days % 7 === 0 ? "weeks" : "days";
}

function campaignLengthAmount(startsOn: string, endsOn: string): number {
  const days = campaignLengthDays(startsOn, endsOn);
  return campaignLengthUnit(startsOn, endsOn) === "weeks" ? days / 7 : days;
}

function relativeCampaignRange(
  amount: number,
  unit: CampaignLengthUnit,
): Pick<CampaignBriefForm, "startsOn" | "endsOn"> {
  const days = unit === "weeks" ? amount * 7 : amount;
  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days - 1);
  return {
    startsOn: start.toISOString().slice(0, 10),
    endsOn: end.toISOString().slice(0, 10),
  };
}
