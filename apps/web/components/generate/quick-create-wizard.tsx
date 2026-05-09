"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useReducer, useState } from "react";

import { I } from "@/components/icons";
import { UseCaseTile } from "./use-case-tile";

// ─── Types ────────────────────────────────────────────────────────────────

export interface UseCaseDTO {
  code: string;
  label: string;
  platform: string | null;
  targetWidth: number;
  targetHeight: number;
  aspectRatio: string;
  icon: string | null;
}

export interface TierBucketDTO {
  defaultModelCode: string;
  eligibleModelCodes: string[];
  modelsByCode: Record<string, { displayName: string; description: string | null }>;
}

export interface TierOptionsDTO {
  standard: { modelCode: string; displayName: string } | null;
  premium: Record<string, TierBucketDTO>;
}

export interface StrengthDTO {
  code: string;
  label: string;
}

interface SizeDTO {
  width: number;
  height: number;
  label: string | null;
}

interface ModelSizesResponse {
  sizes: SizeDTO[];
  allowCustomSize: boolean;
}

interface EstimateResponse {
  totalCredits: number;
  models: Array<{ modelCode: string; displayName: string; credits: number }>;
}

// ─── State ────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;
type Tier = "standard" | "premium";

interface WizardState {
  step: Step;
  useCaseCode: string | null;
  tier: Tier | null;
  strength: string | null;
  selectedModelCodes: string[];
  resolution: { w: number; h: number } | null;
  customSize: { w: number; h: number } | null;
  estimate: EstimateResponse | null;
  modelSizes: Record<string, ModelSizesResponse>;
  // True when the user took the "Generate at native size · crop later" path
  // from step 3's "no native match" branch — D's result page reads
  // ?cropFirst=1 from the URL and auto-opens the crop editor.
  cropFirst: boolean;
}

type Action =
  | { type: "step"; step: Step }
  | { type: "useCase"; code: string }
  | { type: "tier"; tier: Tier }
  | { type: "strength"; strength: string }
  | { type: "toggleCompare"; modelCode: string }
  | { type: "resolution"; w: number; h: number; cropFirst?: boolean }
  | { type: "customSize"; w: number; h: number | null; height?: number }
  | { type: "estimate"; estimate: EstimateResponse | null }
  | { type: "modelSizes"; modelCode: string; payload: ModelSizesResponse }
  | { type: "reset" };

const initialState: WizardState = {
  step: 1,
  useCaseCode: null,
  tier: null,
  strength: null,
  selectedModelCodes: [],
  resolution: null,
  customSize: null,
  estimate: null,
  modelSizes: {},
  cropFirst: false,
};

function reducer(state: WizardState, a: Action): WizardState {
  switch (a.type) {
    case "step":
      return { ...state, step: a.step };
    case "useCase":
      // Picking a use case clears any tier/resolution state below it.
      return {
        ...state,
        useCaseCode: a.code,
        tier: null,
        strength: null,
        selectedModelCodes: [],
        resolution: null,
        customSize: null,
        estimate: null,
        step: 2,
      };
    case "tier": {
      // Standard auto-advances past strength; premium needs strength.
      const next: WizardState = {
        ...state,
        tier: a.tier,
        strength: a.tier === "standard" ? null : state.strength,
        selectedModelCodes: [],
        resolution: null,
        customSize: null,
      };
      if (a.tier === "standard") next.step = 3;
      return next;
    }
    case "strength":
      return {
        ...state,
        strength: a.strength,
        selectedModelCodes: [],
        resolution: null,
        customSize: null,
        step: 3,
      };
    case "toggleCompare": {
      const has = state.selectedModelCodes.includes(a.modelCode);
      return {
        ...state,
        selectedModelCodes: has
          ? state.selectedModelCodes.filter((c) => c !== a.modelCode)
          : [...state.selectedModelCodes, a.modelCode],
        // Reset resolution when the model set changes.
        resolution: null,
        customSize: null,
      };
    }
    case "resolution":
      return {
        ...state,
        resolution: { w: a.w, h: a.h },
        customSize: null,
        cropFirst: a.cropFirst === true,
      };
    case "customSize":
      return {
        ...state,
        customSize: a.h == null ? null : { w: a.w, h: a.h },
        resolution: null,
      };
    case "estimate":
      return { ...state, estimate: a.estimate };
    case "modelSizes":
      return { ...state, modelSizes: { ...state.modelSizes, [a.modelCode]: a.payload } };
    case "reset":
      return initialState;
  }
}

// ─── Aspect-ratio helpers ─────────────────────────────────────────────────

function aspectFloat(s: string): number {
  const [a, b] = s.split(":").map((v) => Number(v.trim()));
  if (!a || !b) return 1;
  return a / b;
}

function aspectsMatch(a: string, b: string, tolerance = 0.05): boolean {
  const ra = aspectFloat(a);
  const rb = aspectFloat(b);
  if (ra === 0 || rb === 0) return false;
  return Math.abs(ra - rb) / Math.max(ra, rb) <= tolerance;
}

function aspectFromWH(w: number, h: number): string {
  const r = w / h;
  if (Math.abs(r - 1) < 0.02) return "1:1";
  if (Math.abs(r - 16 / 9) < 0.02) return "16:9";
  if (Math.abs(r - 9 / 16) < 0.02) return "9:16";
  if (Math.abs(r - 4 / 5) < 0.02) return "4:5";
  if (Math.abs(r - 1.91) < 0.05) return "1.91:1";
  if (Math.abs(r - 2 / 3) < 0.02) return "2:3";
  return `${w}:${h}`;
}

// ─── Component ────────────────────────────────────────────────────────────

interface Props {
  useCases: UseCaseDTO[];
  tierOptions: TierOptionsDTO;
  strengths: StrengthDTO[];
  brandId?: string | null;
  /** Optional initial brief — keeps the textarea controlled by parent if used. */
  brief?: string;
  onBriefChange?: (brief: string) => void;
}

export function QuickCreateWizard(props: Props) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [brief, setBrief] = useState(props.brief ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUseCase = useMemo(
    () => props.useCases.find((u) => u.code === state.useCaseCode) ?? null,
    [props.useCases, state.useCaseCode],
  );

  const activeBucket = useMemo<TierBucketDTO | null>(() => {
    if (state.tier !== "premium" || !state.strength) return null;
    return props.tierOptions.premium[state.strength] ?? null;
  }, [state.tier, state.strength, props.tierOptions]);

  const resolvedModelCodes = useMemo<string[]>(() => {
    if (state.tier === "standard") {
      return props.tierOptions.standard ? [props.tierOptions.standard.modelCode] : [];
    }
    if (!activeBucket) return [];
    return state.selectedModelCodes.length > 0
      ? state.selectedModelCodes
      : [activeBucket.defaultModelCode];
  }, [state.tier, state.selectedModelCodes, activeBucket, props.tierOptions.standard]);

  // Fetch /api/generations/estimate whenever the selection changes.
  useEffect(() => {
    if (!state.tier) {
      dispatch({ type: "estimate", estimate: null });
      return;
    }
    const params = new URLSearchParams();
    params.set("tier", state.tier);
    if (state.strength) params.set("strength", state.strength);
    for (const code of state.selectedModelCodes) params.append("modelCode", code);
    let canceled = false;
    fetch(`/api/generations/estimate?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as EstimateResponse;
      })
      .then((payload) => {
        if (!canceled) dispatch({ type: "estimate", estimate: payload });
      })
      .catch(() => {
        if (!canceled) dispatch({ type: "estimate", estimate: null });
      });
    return () => {
      canceled = true;
    };
  }, [state.tier, state.strength, state.selectedModelCodes]);

  // Fetch /api/models/<code>/sizes for each resolved model.
  useEffect(() => {
    let canceled = false;
    Promise.all(
      resolvedModelCodes
        .filter((code) => !state.modelSizes[code])
        .map(async (code) => {
          const r = await fetch(`/api/models/${encodeURIComponent(code)}/sizes`);
          if (!r.ok) return null;
          const payload = (await r.json()) as ModelSizesResponse;
          return { code, payload };
        }),
    ).then((results) => {
      if (canceled) return;
      for (const r of results) {
        if (r) dispatch({ type: "modelSizes", modelCode: r.code, payload: r.payload });
      }
    });
    return () => {
      canceled = true;
    };
  }, [resolvedModelCodes, state.modelSizes]);

  // Compatible sizes = intersection of every resolved model's supported sizes
  // whose aspect ratio matches the use case (within 5% tolerance).
  const compatibleSizes = useMemo<SizeDTO[]>(() => {
    if (!selectedUseCase || resolvedModelCodes.length === 0) return [];
    const allLoaded = resolvedModelCodes.every((c) => !!state.modelSizes[c]);
    if (!allLoaded) return [];
    const targetAspect = selectedUseCase.aspectRatio;
    // Start from the first model's filtered set, then keep only sizes that
    // *every* resolved model also supports (multi-model variation case).
    const firstSet = state.modelSizes[resolvedModelCodes[0]!]!.sizes.filter((s) =>
      aspectsMatch(aspectFromWH(s.width, s.height), targetAspect),
    );
    return firstSet.filter((s) =>
      resolvedModelCodes.every((c) =>
        state.modelSizes[c]!.sizes.some((m) => m.width === s.width && m.height === s.height),
      ),
    );
  }, [selectedUseCase, resolvedModelCodes, state.modelSizes]);

  const allowCustomSize = useMemo(
    () => resolvedModelCodes.every((c) => state.modelSizes[c]?.allowCustomSize === true),
    [resolvedModelCodes, state.modelSizes],
  );

  const finalSize = state.customSize ?? state.resolution;
  const canSubmit = !!(state.useCaseCode && state.tier && finalSize && brief.trim().length > 0);

  function setBriefLocal(value: string) {
    setBrief(value);
    props.onBriefChange?.(value);
  }

  async function submit() {
    if (!canSubmit || !selectedUseCase || !finalSize || !state.tier) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        brandId: props.brandId ?? null,
        brief,
        outputTarget: {
          kind: "social",
          useCaseCode: selectedUseCase.code,
          width: finalSize.w,
          height: finalSize.h,
          aspectRatio: selectedUseCase.aspectRatio,
        },
        flags: {
          tier: state.tier,
          ...(state.strength ? { strength: state.strength } : {}),
          ...(state.selectedModelCodes.length > 0
            ? { selectedModelCodes: state.selectedModelCodes }
            : {}),
        },
      };
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(json?.error?.message ?? `Request failed: ${res.status}`);
      }
      const json = (await res.json()) as { generationId: string };
      const cropFirstQs = state.cropFirst ? "?cropFirst=1" : "";
      router.push(`/generations/${json.generationId}${cropFirstQs}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Rendering ──────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 880 }}>
      <div className="card" style={{ padding: 20 }}>
        <label className="label">Brief / prompt</label>
        <textarea
          className="textarea"
          rows={4}
          value={brief}
          onChange={(e) => setBriefLocal(e.target.value)}
          placeholder="What should we generate? e.g., a holiday promo with snow and a wrapped gift."
        />
      </div>

      <Step1
        useCases={props.useCases}
        selectedCode={state.useCaseCode}
        open={state.step === 1}
        onOpen={() => dispatch({ type: "step", step: 1 })}
        onPick={(code) => dispatch({ type: "useCase", code })}
      />

      <Step2
        tierOptions={props.tierOptions}
        strengths={props.strengths}
        tier={state.tier}
        strength={state.strength}
        selectedModelCodes={state.selectedModelCodes}
        open={state.step === 2}
        disabled={!state.useCaseCode}
        onOpen={() => state.useCaseCode && dispatch({ type: "step", step: 2 })}
        onTier={(tier) => dispatch({ type: "tier", tier })}
        onStrength={(strength) => dispatch({ type: "strength", strength })}
        onToggleCompare={(modelCode) => dispatch({ type: "toggleCompare", modelCode })}
      />

      <Step3
        useCase={selectedUseCase}
        compatibleSizes={compatibleSizes}
        allowCustomSize={allowCustomSize}
        resolvedModelCodes={resolvedModelCodes}
        modelSizes={state.modelSizes}
        resolution={state.resolution}
        customSize={state.customSize}
        open={state.step === 3}
        disabled={!state.tier}
        onOpen={() => state.tier && dispatch({ type: "step", step: 3 })}
        onPick={(w, h) => dispatch({ type: "resolution", w, h })}
        onCustom={(w, h) => dispatch({ type: "customSize", w, h })}
        onTrySwap={() => dispatch({ type: "step", step: 2 })}
        onFallbackToLargest={() => {
          // Pick the largest size among the first model's full set, regardless
          // of aspect — D's recompose UI will offer the crop afterwards. The
          // cropFirst flag tags this submit so the result page auto-opens the
          // crop editor on the first variant after it completes.
          const first = resolvedModelCodes[0];
          if (!first) return;
          const sizes = state.modelSizes[first]?.sizes ?? [];
          const sorted = [...sizes].sort((a, b) => b.width * b.height - a.width * a.height);
          if (sorted[0])
            dispatch({
              type: "resolution",
              w: sorted[0].width,
              h: sorted[0].height,
              cropFirst: true,
            });
        }}
      />

      <div
        className="card"
        style={{
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Total</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            {state.estimate ? `${state.estimate.totalCredits} credits` : "—"}
          </span>
          {state.estimate && state.estimate.models.length > 1 ? (
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>
              {state.estimate.models
                .map((m) => `${m.displayName} (${m.credits})`)
                .join(" + ")}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn--accent"
          disabled={!canSubmit || submitting}
          onClick={() => void submit()}
        >
          {submitting ? "Generating…" : "Submit"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            padding: 12,
            background: "var(--cal-red-50, #fef2f2)",
            color: "var(--studio-red, #c00)",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

// ─── Step 1: Use case ─────────────────────────────────────────────────────

function Step1(props: {
  useCases: UseCaseDTO[];
  selectedCode: string | null;
  open: boolean;
  onOpen: () => void;
  onPick: (code: string) => void;
}) {
  const selected = props.useCases.find((u) => u.code === props.selectedCode);
  return (
    <AccordionCard
      title="Step 1 · Where will this go?"
      summary={selected ? `${selected.icon ?? ""} ${selected.label}`.trim() : ""}
      open={props.open}
      onOpen={props.onOpen}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {props.useCases.map((u) => (
          <UseCaseTile
            key={u.code}
            code={u.code}
            label={u.label}
            icon={u.icon}
            platform={u.platform}
            targetWidth={u.targetWidth}
            targetHeight={u.targetHeight}
            aspectRatio={u.aspectRatio}
            active={u.code === props.selectedCode}
            onClick={() => props.onPick(u.code)}
          />
        ))}
      </div>
    </AccordionCard>
  );
}

// ─── Step 2: Tier + strength ─────────────────────────────────────────────

function Step2(props: {
  tierOptions: TierOptionsDTO;
  strengths: StrengthDTO[];
  tier: Tier | null;
  strength: string | null;
  selectedModelCodes: string[];
  open: boolean;
  disabled: boolean;
  onOpen: () => void;
  onTier: (tier: Tier) => void;
  onStrength: (strength: string) => void;
  onToggleCompare: (modelCode: string) => void;
}) {
  const bucket =
    props.tier === "premium" && props.strength
      ? props.tierOptions.premium[props.strength] ?? null
      : null;
  const compareCandidates =
    bucket?.eligibleModelCodes.filter((c) => c !== bucket.defaultModelCode) ?? [];

  const summary = (() => {
    if (!props.tier) return "";
    if (props.tier === "standard") {
      const m = props.tierOptions.standard;
      return m ? `Standard · ${m.displayName}` : "Standard";
    }
    if (!props.strength) return "Premium";
    const sLabel = props.strengths.find((s) => s.code === props.strength)?.label ?? props.strength;
    const def = bucket?.defaultModelCode;
    return def ? `Premium · ${sLabel} · ${bucket?.modelsByCode[def]?.displayName ?? def}` : "Premium";
  })();

  return (
    <AccordionCard
      title="Step 2 · How should it look?"
      summary={summary}
      open={props.open}
      disabled={props.disabled}
      onOpen={props.onOpen}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <TierRadio
            active={props.tier === "standard"}
            label="Standard"
            sub={
              props.tierOptions.standard
                ? `${props.tierOptions.standard.displayName} — fast & affordable`
                : "Fast & affordable"
            }
            onClick={() => props.onTier("standard")}
            disabled={!props.tierOptions.standard}
          />
          <TierRadio
            active={props.tier === "premium"}
            label="Premium"
            sub="Pick a strength below"
            onClick={() => props.onTier("premium")}
            disabled={Object.keys(props.tierOptions.premium).length === 0}
          />
        </div>

        {props.tier === "premium" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {props.strengths.map((s) => {
                const has = !!props.tierOptions.premium[s.code];
                const active = props.strength === s.code;
                return (
                  <button
                    key={s.code}
                    type="button"
                    title={has ? "" : "Coming soon — no model wired to this strength yet"}
                    disabled={!has}
                    aria-pressed={active}
                    className={`pill ${active ? "pill--green" : "pill--ring"}`}
                    style={{
                      cursor: has ? "pointer" : "not-allowed",
                      opacity: has ? 1 : 0.45,
                      padding: "6px 12px",
                    }}
                    onClick={() => props.onStrength(s.code)}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {bucket && compareCandidates.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
                  Compare with (multi-model variation):
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {compareCandidates.map((code) => {
                    const active = props.selectedModelCodes.includes(code);
                    const dn = bucket.modelsByCode[code]?.displayName ?? code;
                    return (
                      <button
                        key={code}
                        type="button"
                        aria-pressed={active}
                        className={`pill ${active ? "pill--green" : "pill--ring"}`}
                        style={{ padding: "6px 12px", cursor: "pointer" }}
                        onClick={() => props.onToggleCompare(code)}
                      >
                        {active ? <I.Check size={11} /> : <I.Plus size={11} />}
                        <span>{dn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </AccordionCard>
  );
}

function TierRadio(props: {
  active: boolean;
  label: string;
  sub: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-pressed={props.active}
      style={{
        flex: 1,
        padding: "12px 14px",
        textAlign: "left",
        background: props.active ? "var(--cal-blue-50, #eff6ff)" : "white",
        border: `1px solid ${props.active ? "var(--cal-blue-500, #3b82f6)" : "var(--cal-gray-200)"}`,
        borderRadius: 8,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.5 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 14 }}>{props.label}</span>
      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{props.sub}</span>
    </button>
  );
}

// ─── Step 3: Resolution ───────────────────────────────────────────────────

function Step3(props: {
  useCase: UseCaseDTO | null;
  compatibleSizes: SizeDTO[];
  allowCustomSize: boolean;
  resolvedModelCodes: string[];
  modelSizes: Record<string, ModelSizesResponse>;
  resolution: { w: number; h: number } | null;
  customSize: { w: number; h: number } | null;
  open: boolean;
  disabled: boolean;
  onOpen: () => void;
  onPick: (w: number, h: number) => void;
  onCustom: (w: number, h: number | null) => void;
  onTrySwap: () => void;
  onFallbackToLargest: () => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customW, setCustomW] = useState("1024");
  const [customH, setCustomH] = useState("1024");

  const hasLoadedAll =
    props.resolvedModelCodes.length > 0 &&
    props.resolvedModelCodes.every((c) => !!props.modelSizes[c]);
  const noNativeMatch = hasLoadedAll && props.compatibleSizes.length === 0;

  const final = props.customSize ?? props.resolution;
  const summary = final ? `${final.w} × ${final.h}` : "";

  return (
    <AccordionCard
      title="Step 3 · Pick a resolution"
      summary={summary}
      open={props.open}
      disabled={props.disabled}
      onOpen={props.onOpen}
    >
      {!props.useCase || props.resolvedModelCodes.length === 0 ? (
        <p style={{ color: "var(--fg-3)", fontSize: 13 }}>Pick step 1 and 2 first.</p>
      ) : !hasLoadedAll ? (
        <p style={{ color: "var(--fg-3)", fontSize: 13 }}>Loading sizes…</p>
      ) : noNativeMatch ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13 }}>
            No native size matches{" "}
            <strong>
              {props.useCase.label} ({props.useCase.aspectRatio})
            </strong>{" "}
            for the selected model
            {props.resolvedModelCodes.length > 1 ? "s" : ""}. Pick a different strength or
            generate at the model&apos;s native size and crop afterwards.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn--secondary" onClick={props.onTrySwap}>
              Try a different strength
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={props.onFallbackToLargest}
            >
              Generate at native size · crop later
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {props.compatibleSizes.map((s) => {
              const active =
                props.resolution?.w === s.width && props.resolution?.h === s.height;
              return (
                <button
                  key={`${s.width}x${s.height}`}
                  type="button"
                  aria-pressed={active}
                  className={`pill ${active ? "pill--green" : "pill--ring"}`}
                  style={{ padding: "8px 14px", cursor: "pointer" }}
                  onClick={() => props.onPick(s.width, s.height)}
                >
                  <span className="mono">
                    {s.width}×{s.height}
                  </span>
                  {s.label ? (
                    <span style={{ marginLeft: 6, color: "var(--fg-3)" }}>{s.label}</span>
                  ) : null}
                </button>
              );
            })}
            {props.allowCustomSize ? (
              <button
                type="button"
                className={`pill ${props.customSize ? "pill--green" : "pill--ring"}`}
                style={{ padding: "8px 14px", cursor: "pointer" }}
                onClick={() => setCustomOpen((o) => !o)}
              >
                Custom W×H
              </button>
            ) : null}
          </div>

          {customOpen && props.allowCustomSize ? (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div>
                <label className="label">Width</label>
                <input
                  className="input mono"
                  style={{ width: 110 }}
                  type="number"
                  value={customW}
                  onChange={(e) => setCustomW(e.target.value)}
                />
              </div>
              <span style={{ marginBottom: 8 }}>×</span>
              <div>
                <label className="label">Height</label>
                <input
                  className="input mono"
                  style={{ width: 110 }}
                  type="number"
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  const w = Number(customW);
                  const h = Number(customH);
                  if (w > 0 && h > 0) props.onCustom(w, h);
                }}
              >
                Apply
              </button>
            </div>
          ) : null}
        </div>
      )}
    </AccordionCard>
  );
}

// ─── Accordion shell ──────────────────────────────────────────────────────

function AccordionCard(props: {
  title: string;
  summary?: string;
  open: boolean;
  disabled?: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 0,
        opacity: props.disabled ? 0.5 : 1,
        pointerEvents: props.disabled ? "none" : "auto",
      }}
    >
      <button
        type="button"
        onClick={props.onOpen}
        style={{
          width: "100%",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: 0,
          borderBottom: props.open ? "1px solid var(--cal-gray-200)" : "0",
          cursor: props.disabled ? "not-allowed" : "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{props.title}</span>
          {props.summary ? (
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{props.summary}</span>
          ) : null}
        </div>
        {props.open ? <I.ChevronUp size={14} /> : <I.ChevronDown size={14} />}
      </button>
      {props.open ? <div style={{ padding: 18 }}>{props.children}</div> : null}
    </div>
  );
}
