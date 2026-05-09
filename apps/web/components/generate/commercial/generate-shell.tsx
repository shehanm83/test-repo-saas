"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";

import { CampaignBuilder } from "./campaign-builder";
import { QuickCreate } from "./quick-create";
import { ReviewRail } from "./review-rail";
import type {
  BrandFlags,
  BrandLite,
  CampaignDetails,
  CompositionControls,
  CreationType,
  GenerateMode,
  GeneratePayload,
  GenerateState,
  MoodLite,
  OutputSettings,
  PromptPreviewResult,
  ProductLite,
  ProductRole,
  PreflightResult,
  SelectedProduct,
  StrengthLite,
  TemplateSelection,
  TierOptionsLite,
  UseCaseLite,
} from "./types";

type Action =
  | { type: "mode"; mode: GenerateMode }
  | { type: "step"; step: number }
  | { type: "creationType"; creationType: CreationType }
  | { type: "brief"; brief: string }
  | { type: "campaign"; patch: Partial<CampaignDetails> }
  | { type: "template"; template: TemplateSelection }
  | { type: "composition"; composition: CompositionControls }
  | { type: "outputs"; outputs: OutputSettings }
  | { type: "brand"; brandId: string }
  | { type: "mood"; moodId: string | null }
  | { type: "flags"; flags: BrandFlags }
  | { type: "brandLogoAssetIds"; ids: string[] }
  | { type: "addProduct"; product: SelectedProduct }
  | { type: "removeProduct"; localId: string }
  | { type: "productRole"; localId: string; role: ProductRole }
  // Sub-project C — section 1 picks a use_case (with resolved W×H + aspect)
  // OR (future) a custom W×H. Pass the resolved values in to keep
  // buildGeneratePayload lookup-free.
  | {
      type: "useCase";
      payload: { code: string; width: number; height: number; aspectRatio: string } | null;
    }
  | { type: "customSize"; width: number | null; height: number | null }
  // Sub-project A — section 7 tier/strength/model selection.
  | { type: "tier"; tier: "standard" | "premium" }
  | { type: "strength"; strength: string | null }
  | { type: "selectedModelCodes"; codes: string[] };

function initialState(brands: BrandLite[]): GenerateState {
  void brands;
  return {
    mode: "quick",
    activeStep: 0,
    creationType: "single_product",
    brandId: "",
    moodId: null,
    brief: "",
    selectedProducts: [],
    campaign: {
      title: "",
      subtitle: "",
      message: "",
      price: "",
      discount: "",
      badgeText: "",
      cta: "",
      offerExpiry: "",
      legalText: "",
      website: "",
      phone: "",
      qrUrl: "",
      benefitsText: "",
      targetAudience: "",
    },
    template: { family: "product_hero", layout: "centered_product_hero" },
    composition: {
      productSize: "balanced",
      productPosition: "template",
      backgroundStyle: "studio",
      realism: "realistic_photo",
      shadowReflection: "soft_shadow",
      labelVisibility: "preserve",
      packagingVisibility: "product_only",
      keepOriginalShape: true,
      brandBlend: "medium",
    },
    outputs: {
      variants: 2,
      quality: "standard",
      consistency: "off",
      formats: ["instagram_square"],
    },
    flags: {
      useBrandColors: true,
      useBrandLogo: false,
      useBrandFonts: true,
      brandStrict: false,
      applyMoodModifiers: true,
      applyMoodDecorations: true,
      applyMoodAccentColors: true,
      usePremiumModel: false,
      tier: "standard",
    },
    brandLogoAssetIds: [],
    selectedUseCase: null,
    customSize: null,
  };
}

function reducer(state: GenerateState, action: Action): GenerateState {
  switch (action.type) {
    case "mode":
      return {
        ...state,
        mode: action.mode,
        activeStep: 0,
        creationType: action.mode === "quick" ? "single_product" : state.creationType,
        template: action.mode === "quick" ? { family: "product_hero", layout: "centered_product_hero" } : state.template,
        outputs: action.mode === "quick" ? { ...state.outputs, formats: [state.outputs.formats[0] ?? "instagram_square"], consistency: "off" } : state.outputs,
      };
    case "step":
      return { ...state, activeStep: action.step };
    case "creationType":
      return { ...state, creationType: action.creationType };
    case "brief":
      return { ...state, brief: action.brief };
    case "campaign":
      return { ...state, campaign: { ...state.campaign, ...action.patch } };
    case "template":
      return { ...state, template: action.template };
    case "composition":
      return { ...state, composition: action.composition };
    case "outputs":
      return {
        ...state,
        outputs: {
          ...action.outputs,
          quality: action.outputs.quality,
        },
        flags: { ...state.flags, usePremiumModel: action.outputs.quality === "premium" },
      };
    case "brand":
      return { ...state, brandId: action.brandId, brandLogoAssetIds: [] };
    case "mood":
      return { ...state, moodId: action.moodId };
    case "flags":
      return { ...state, flags: action.flags };
    case "brandLogoAssetIds":
      return { ...state, brandLogoAssetIds: action.ids };
    case "addProduct": {
      const existingIndex = state.selectedProducts.findIndex((product) => product.localId === action.product.localId);
      if (existingIndex >= 0) {
        const selectedProducts = [...state.selectedProducts];
        selectedProducts[existingIndex] = action.product;
        return { ...state, selectedProducts };
      }
      return { ...state, selectedProducts: [...state.selectedProducts, action.product] };
    }
    case "removeProduct":
      return { ...state, selectedProducts: state.selectedProducts.filter((product) => product.localId !== action.localId) };
    case "productRole":
      return {
        ...state,
        selectedProducts: state.selectedProducts.map((product) =>
          product.localId === action.localId ? { ...product, role: action.role } : product,
        ),
      };
    case "useCase":
      return { ...state, selectedUseCase: action.payload, customSize: null };
    case "customSize":
      if (action.width == null || action.height == null) {
        return { ...state, customSize: null };
      }
      return {
        ...state,
        customSize: { width: action.width, height: action.height },
        selectedUseCase: null,
      };
    case "tier": {
      // Strip strength/compare when switching to standard. With
      // exactOptionalPropertyTypes we can't write `undefined` — must omit.
      const { strength: _s, selectedModelCodes: _m, ...flagsWithoutPremium } = state.flags;
      void _s;
      void _m;
      const flags: BrandFlags =
        action.tier === "standard"
          ? { ...flagsWithoutPremium, tier: "standard", usePremiumModel: false }
          : { ...state.flags, tier: "premium", usePremiumModel: true };
      return {
        ...state,
        flags,
        // outputs.quality stays mirrored — review rail + credit estimate read it.
        outputs: { ...state.outputs, quality: action.tier },
      };
    }
    case "strength": {
      // Compare-with selection is bucket-specific; reset on strength change.
      const { selectedModelCodes: _m, ...rest } = state.flags;
      void _m;
      const flags: BrandFlags = action.strength
        ? { ...rest, strength: action.strength }
        : (() => {
            const { strength: _s, ...noStrength } = rest;
            void _s;
            return noStrength;
          })();
      return { ...state, flags };
    }
    case "selectedModelCodes": {
      const { selectedModelCodes: _m, ...rest } = state.flags;
      void _m;
      const flags: BrandFlags =
        action.codes.length > 0
          ? { ...rest, selectedModelCodes: action.codes }
          : rest;
      return { ...state, flags };
    }
  }
}

export function buildGeneratePayload(state: GenerateState): GeneratePayload {
  const campaign = cleanObject({
    title: state.campaign.title,
    subtitle: state.campaign.subtitle,
    message: state.campaign.message,
    price: state.campaign.price,
    discount: state.campaign.discount,
    badgeText: state.campaign.badgeText,
    cta: state.campaign.cta,
    offerExpiry: state.campaign.offerExpiry,
    legalText: state.campaign.legalText,
    website: state.campaign.website,
    phone: state.campaign.phone,
    qrUrl: state.campaign.qrUrl,
    benefits: state.campaign.benefitsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    targetAudience: state.campaign.targetAudience,
  });

  // Sub-project C: when section 1 picks a use_case, build the new
  // outputTarget shape. Server (GenerationApi.buildPlan) looks up the
  // use_case row and uses its aspect_ratio as authoritative.
  const useCaseTarget = state.selectedUseCase
    ? {
        kind: "social" as const,
        useCaseCode: state.selectedUseCase.code,
        width: state.selectedUseCase.width,
        height: state.selectedUseCase.height,
        aspectRatio: state.selectedUseCase.aspectRatio,
      }
    : null;

  return {
    mode: state.mode,
    creationType: state.creationType,
    ...(state.brandId ? { brandId: state.brandId } : {}),
    moodId: state.moodId,
    brief: state.brief.trim(),
    ...(useCaseTarget ? { outputTarget: useCaseTarget } : {}),
    productRefs: state.selectedProducts.map((product) => ({
      ...(product.productId ? { productId: product.productId } : {}),
      ...(product.uploadId ? { uploadId: product.uploadId } : {}),
      role: product.role,
      commercialFields: cleanObject(product.commercialFields),
    })),
    campaign,
    template: state.template,
    composition: state.composition,
    outputs: state.outputs,
    flags: state.flags,
    brandLogoAssetIds: state.flags.useBrandLogo ? state.brandLogoAssetIds : [],
  };
}

export function GenerateShell(props: {
  brands: BrandLite[];
  moods: MoodLite[];
  products: ProductLite[];
  credits: number;
  // Sub-project A + C lookups for the new section 1 / section 7.
  useCases: UseCaseLite[];
  tierOptions: TierOptionsLite;
  strengths: StrengthLite[];
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, props.brands, initialState);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [promptPreviewLoading, setPromptPreviewLoading] = useState(false);
  const [promptPreview, setPromptPreview] = useState<PromptPreviewResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const payload = useMemo(() => buildGeneratePayload(state), [state]);

  useEffect(() => {
    if (!state.brief.trim()) {
      setPreflight(null);
      setPreflightError(null);
      setPreflightLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPreflightLoading(true);
      fetch("/api/generations/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const json = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
            throw new Error(json?.error?.message ?? "Preflight failed");
          }
          return response.json() as Promise<PreflightResult>;
        })
        .then((result) => {
          setPreflight(result);
          setPreflightError(null);
        })
        .catch((error: Error) => {
          if (error.name !== "AbortError") {
            setPreflightError(error.message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setPreflightLoading(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [payload, state.brief]);

  const quickReady =
    state.brief.trim().length > 0 &&
    state.outputs.formats.length > 0 &&
    Boolean(state.outputs.quality) &&
    state.outputs.variants > 0;
  const campaignBuilderReady =
    state.brandId.length > 0 &&
    state.selectedProducts.length > 0 &&
    state.brief.trim().length > 0 &&
    state.outputs.formats.length > 0;
  const canSubmit =
    !pending &&
    !promptPreviewLoading &&
    (state.mode === "quick" ? quickReady : campaignBuilderReady) &&
    !preflightLoading &&
    (preflight?.blocking.length ?? 0) === 0;

  async function previewPrompt() {
    if (!canSubmit) return;
    setPromptPreviewLoading(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/generations/prompt-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildGeneratePayload(state)),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(json?.error?.message ?? "Failed to build prompt preview");
      }
      setPromptPreview((await response.json()) as PromptPreviewResult);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setPromptPreviewLoading(false);
    }
  }

  async function submit() {
    if (pending) return;
    setPending(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildGeneratePayload(state)),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(json?.error?.message ?? "Failed to generate");
      }
      const json = (await response.json()) as { generationId: string };
      router.push(`/generations/${json.generationId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
      setPending(false);
    }
  }

  return (
    <div className="cg-page">
      <div className="cg-header">
        <div>
          <span className="cg-kicker">New generation</span>
          <h1>Commercial image builder</h1>
          <p>Build product-aware ads, campaign assets, and single images with structured commercial controls.</p>
        </div>
      </div>

      <div className="cg-pathway-tabs" role="tablist" aria-label="Generation mode">
        <button
          type="button"
          role="tab"
          aria-label="Quick Create"
          aria-selected={state.mode === "quick"}
          className={state.mode === "quick" ? "is-selected" : ""}
          onClick={() => dispatch({ type: "mode", mode: "quick" })}
        >
          <strong>Quick Create</strong>
          <span>Fast single image flow for social posts, product shots, and simple promotions.</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-label="Campaign Builder"
          aria-selected={state.mode === "campaign_builder"}
          className={state.mode === "campaign_builder" ? "is-selected" : ""}
          onClick={() => dispatch({ type: "mode", mode: "campaign_builder" })}
        >
          <strong>Campaign Builder</strong>
          <span>Guided campaign workflow for multi-step ads, formats, brand rules, and review.</span>
        </button>
      </div>

      <div className="cg-workspace">
        <main>
          {state.mode === "quick" ? (
            <QuickCreate
              state={state}
              brands={props.brands}
              moods={props.moods}
              products={props.products}
              useCases={props.useCases}
              tierOptions={props.tierOptions}
              strengths={props.strengths}
              onBriefChange={(brief) => dispatch({ type: "brief", brief })}
              onCampaignChange={(patch) => dispatch({ type: "campaign", patch })}
              onAddProduct={(product) => dispatch({ type: "addProduct", product })}
              onRemoveProduct={(localId) => dispatch({ type: "removeProduct", localId })}
              onProductRoleChange={(localId, role) => dispatch({ type: "productRole", localId, role })}
              onBrandChange={(brandId) => dispatch({ type: "brand", brandId })}
              onMoodChange={(moodId) => dispatch({ type: "mood", moodId })}
              onFlagsChange={(flags) => dispatch({ type: "flags", flags })}
              onBrandLogoAssetIdsChange={(ids) => dispatch({ type: "brandLogoAssetIds", ids })}
              onOutputsChange={(outputs) => dispatch({ type: "outputs", outputs })}
              onUseCaseChange={(payload) => dispatch({ type: "useCase", payload })}
              onTierChange={(tier) => dispatch({ type: "tier", tier })}
              onStrengthChange={(strength) => dispatch({ type: "strength", strength })}
              onCompareModelsChange={(codes) => dispatch({ type: "selectedModelCodes", codes })}
            />
          ) : (
            <CampaignBuilder
              state={state}
              brands={props.brands}
              moods={props.moods}
              products={props.products}
              canSubmit={canSubmit}
              onStepChange={(step) => dispatch({ type: "step", step })}
              onCreationTypeChange={(creationType) => dispatch({ type: "creationType", creationType })}
              onBriefChange={(brief) => dispatch({ type: "brief", brief })}
              onCampaignChange={(patch) => dispatch({ type: "campaign", patch })}
              onTemplateChange={(template) => dispatch({ type: "template", template })}
              onCompositionChange={(composition) => dispatch({ type: "composition", composition })}
              onOutputsChange={(outputs) => dispatch({ type: "outputs", outputs })}
              onAddProduct={(product) => dispatch({ type: "addProduct", product })}
              onRemoveProduct={(localId) => dispatch({ type: "removeProduct", localId })}
              onProductRoleChange={(localId, role) => dispatch({ type: "productRole", localId, role })}
              onBrandChange={(brandId) => dispatch({ type: "brand", brandId })}
              onMoodChange={(moodId) => dispatch({ type: "mood", moodId })}
              onFlagsChange={(flags) => dispatch({ type: "flags", flags })}
            />
          )}
        </main>

        <ReviewRail
          state={state}
          credits={props.credits}
          preflight={preflight}
          preflightLoading={preflightLoading}
          preflightError={preflightError}
          submitError={submitError}
          pending={pending}
          promptPreviewLoading={promptPreviewLoading}
          canSubmit={canSubmit}
          onSubmit={() => void previewPrompt()}
        />
      </div>

      {promptPreview ? (
        <PromptPreviewDialog
          preview={promptPreview}
          pending={pending}
          error={submitError}
          onClose={() => setPromptPreview(null)}
          onGenerate={() => void submit()}
        />
      ) : null}
    </div>
  );
}

function PromptPreviewDialog(props: {
  preview: PromptPreviewResult;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onGenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const overlayJson = JSON.stringify(props.preview.overlaySlots, null, 2);

  async function copyPrompt() {
    await navigator.clipboard.writeText(props.preview.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <div className="scrim" onClick={props.onClose} />
      <div className="modal cg-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-preview-title">
        <div className="cg-prompt-modal__head">
          <div>
            <span className="cg-kicker">OpenAI prompt preview</span>
            <h2 id="prompt-preview-title">Prompt sent to image model</h2>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={props.onClose}>Close</button>
        </div>

        <div className="cg-prompt-meta">
          <span>{props.preview.templatePath} v{props.preview.templateVersion}</span>
          <span>{props.preview.outputTarget.platform ?? "image"} / {props.preview.outputTarget.format ?? props.preview.outputTarget.aspectRatio}</span>
          <span>{props.preview.outputTarget.width} x {props.preview.outputTarget.height}</span>
          {props.preview.generationTemplate ? <span>{props.preview.generationTemplate.name}</span> : null}
        </div>

        <section className="cg-prompt-block">
          <div className="cg-prompt-block__title">
            <strong>Prompt</strong>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => void copyPrompt()}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre>{props.preview.prompt}</pre>
        </section>

        {props.preview.negativePrompt ? (
          <section className="cg-prompt-block">
            <div className="cg-prompt-block__title">
              <strong>Negative prompt</strong>
            </div>
            <pre>{props.preview.negativePrompt}</pre>
          </section>
        ) : null}

        <section className="cg-prompt-block">
          <div className="cg-prompt-block__title">
            <strong>Renderer overlay slots</strong>
          </div>
          <pre>{overlayJson}</pre>
        </section>

        {props.error ? (
          <div className="cg-submit-error" style={{ margin: "0 0 4px" }}>{props.error}</div>
        ) : null}
        <div className="cg-prompt-modal__foot">
          <button type="button" className="btn btn--ghost" onClick={props.onClose}>Back to edit</button>
          <button type="button" className="btn btn--accent" disabled={props.pending} onClick={props.onGenerate}>
            {props.pending ? "Generating..." : "Start generation"}
          </button>
        </div>
      </div>
    </>
  );
}

function cleanObject<T extends object>(value: T) {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, item]) => {
      if (Array.isArray(item)) return item.length > 0;
      return item !== undefined && item !== null && item !== "";
    }),
  ) as Partial<T>;
}
