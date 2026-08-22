"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Lock } from "lucide-react";

import type { BrandLite, ProductLite } from "@/components/generate/commercial/types";

import {
  durationDays,
  durationLabel,
  recipeMeta,
  validateBrief,
  type BriefValidation,
  type CampaignBriefForm,
} from "../types";
import { estimateBrief } from "./fixtures";
import { BOX_INPUT, FieldBox } from "./field-box";
import { OfferFields } from "./offer-fields";
import { PlatformToggles } from "./platform-toggles";
import { ProductChips } from "./product-chips";
import { RecipePicker } from "./recipe-picker";

const LABEL = "mb-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft/70";

function Field(props: {
  label: ReactNode;
  error?: string | undefined;
  children: ReactNode;
}) {
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
  const meta = recipeMeta(form.recipe);
  const validation = useMemo(() => validateBrief(form), [form]);
  const duration = durationLabel(form.startsOn, form.endsOn);
  const estimate = useMemo(
    () => estimateBrief(form, durationDays(form.startsOn, form.endsOn)),
    [form],
  );
  const brand = props.brands.find((entry) => entry.id === form.brandId) ?? null;
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
          <RecipePicker
            value={form.recipe}
            onChange={(recipe) => patch({ recipe })}
          />
        </Field>

        <Field label="Brand" error={errorFor("brandId")}>
          <select
            className="select max-w-[360px]"
            value={form.brandId}
            aria-label="Brand"
            onChange={(event) => patch({ brandId: event.target.value })}
          >
            <option value="">Choose a brand…</option>
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
            products={brandProducts}
            selected={form.productRefs}
            onChange={(productRefs) => patch({ productRefs })}
          />
        </Field>

        <Field label="Where it runs" error={errorFor("platforms")}>
          <PlatformToggles value={form.platforms} onChange={(platforms) => patch({ platforms })} />
        </Field>

        <Field label="When it runs" error={errorFor("dates")}>
          <div className="flex flex-wrap items-center gap-2.5">
            <FieldBox label="Starts" className="w-[170px]">
              <input
                type="date"
                className={BOX_INPUT}
                value={form.startsOn}
                onChange={(event) => patch({ startsOn: event.target.value })}
              />
            </FieldBox>
            <span className="text-ink-soft/40" aria-hidden="true">
              →
            </span>
            <FieldBox label="Ends" className="w-[170px]">
              <input
                type="date"
                className={BOX_INPUT}
                value={form.endsOn}
                onChange={(event) => patch({ endsOn: event.target.value })}
              />
            </FieldBox>
            {duration ? <span className="pill">{duration}</span> : null}
          </div>
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
            Build the plan
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
              <div className="mb-3 flex items-center gap-2.5">
                <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-xl bg-ink-deep font-display text-[15px] font-bold text-white">
                  {brand.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="leading-tight">
                  <b className="text-[13.5px]">{brand.name}</b>
                  <br />
                  <span className="text-[11.5px] text-ink-soft/70">
                    {brand.palette?.length
                      ? `${brand.palette.length} colours`
                      : "No palette saved"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {(brand.palette ?? []).slice(0, 6).map((color) => (
                  <span
                    key={color}
                    className="h-[26px] w-[26px] rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)]"
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12.5px] text-ink-soft">
              Pick a brand and its palette, fonts and logo lock to the campaign.
            </p>
          )}
          <div className="mt-3 flex items-start gap-[7px] rounded-xl bg-brand-50 px-3 py-2.5 text-[11.5px] font-medium leading-[1.5] text-brand-700">
            <Lock size={12} strokeWidth={2.2} className="mt-px flex-none" />
            Logo, fonts and palette are placed by the renderer — never generated.
          </div>
        </div>

        <div className="rounded-2xl bg-white px-4 py-4 shadow-card">
          <h5 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-ink-soft/70">
            What you&rsquo;ll get
          </h5>
          <RailRow k="Planned assets" v={`~${estimate.slots}`} />
          <RailRow k="Phases" v={String(estimate.phases)} />
          <RailRow k="Captions + hashtags" v="included" />
          <RailRow k="Video slots" v={estimate.videoSlots > 0 ? `~${estimate.videoSlots}` : "none"} />
          <div className="mt-1.5 flex items-center gap-2.5 border-t border-ink/10 pt-2.5 text-[12.5px] font-semibold">
            <span className="text-ink-soft">Est. credits</span>
            <span className="ml-auto font-mono text-sm tabular-nums text-brand">
              ~{estimate.credits}
            </span>
          </div>
          <p className="mt-2.5 text-[11.5px] leading-[1.5] text-ink-soft/70">
            Nothing is charged until you approve the plan.
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
