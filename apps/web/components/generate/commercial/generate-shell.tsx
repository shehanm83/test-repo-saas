"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { OUTPUT_FORMAT_TARGETS } from "@layertone/shared/generation/commercial-contract";
import type { QuickCreatePlan } from "@layertone/shared/generation/quick-create-v2";

import { trackQuickCreateEvent } from "@/lib/quick-create-events";

import { QuickCreate } from "./quick-create";
import {
  type InlineGeneration,
  type MoodInfluence,
  type MoodMode,
  QuickCreateV2,
} from "./quick-create-v2";
import { ReviewRail } from "./review-rail";
import type {
  BrandFlags,
  BrandLite,
  CampaignDetails,
  GeneratePayload,
  GenerateState,
  MoodLite,
  OutputSettings,
  PromptPreviewResult,
  ProductLite,
  ProductRole,
  PreflightResult,
  SelectedProduct,
  StockAssetLite,
  VisualReference,
} from "./types";

type Action =
  | { type: "restore"; state: GenerateState }
  | { type: "brief"; brief: string }
  | { type: "campaign"; patch: Partial<CampaignDetails> }
  | { type: "outputs"; outputs: OutputSettings }
  | { type: "brand"; brandId: string }
  | { type: "mood"; moodId: string | null }
  | { type: "stockAssetId"; stockAssetId: string | null }
  | { type: "referenceInfluence"; influence: GenerateState["referenceInfluence"] }
  | { type: "flags"; flags: BrandFlags }
  | { type: "brandLogoAssetIds"; ids: string[] }
  | { type: "addProduct"; product: SelectedProduct }
  | { type: "removeProduct"; localId: string }
  | { type: "addVisualReference"; reference: VisualReference }
  | { type: "removeVisualReference"; localId: string }
  | { type: "productRole"; localId: string; role: ProductRole }
  | { type: "composition"; patch: Partial<GenerateState["composition"]> };

function initialState(brands: BrandLite[], selectSoleBrand = false): GenerateState {
  const soleBrand = selectSoleBrand && brands.length === 1 ? brands[0]! : null;
  return {
    mode: "quick",
    activeStep: 0,
    creationType: "single_product",
    brandId: soleBrand?.id ?? "",
    moodId: null,
    stockAssetId: null,
    referenceInfluence: "balanced",
    brief: "",
    selectedProducts: [],
    visualReferences: [],
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
      useBrandLogo: Boolean(soleBrand?.logoAssets?.length),
      useBrandFonts: true,
      brandStrict: false,
      applyMoodModifiers: true,
      applyMoodDecorations: true,
      applyMoodAccentColors: true,
      usePremiumModel: false,
    },
    brandLogoAssetIds: [],
  };
}

type QuickCreateDraft = {
  state: GenerateState;
  moodMode: MoodMode;
  moodInfluence: MoodInfluence;
  savedAt?: string;
};

function parseQuickCreateDraft(value: unknown): QuickCreateDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<QuickCreateDraft>;
  if (!draft.state || draft.state.mode !== "quick") return null;
  return draft as QuickCreateDraft;
}

function newestDraft(local: QuickCreateDraft | null, server: QuickCreateDraft | null) {
  if (!local) return server;
  if (!server) return local;
  const localTime = Date.parse(local.savedAt ?? "") || 0;
  const serverTime = Date.parse(server.savedAt ?? "") || 0;
  return serverTime > localTime ? server : local;
}

function serializeQuickCreateDraft(
  state: GenerateState,
  moodMode: MoodMode,
  moodInfluence: MoodInfluence,
): QuickCreateDraft {
  return {
    state: {
      ...state,
      selectedProducts: state.selectedProducts.map((product) => {
        if (!product.previewUrl?.startsWith("blob:")) return product;
        const { previewUrl: _previewUrl, ...persisted } = product;
        return persisted;
      }),
      visualReferences: state.visualReferences.map((reference) => {
        if (!reference.previewUrl?.startsWith("blob:")) return reference;
        const { previewUrl: _previewUrl, ...persisted } = reference;
        return persisted;
      }),
    },
    moodMode,
    moodInfluence,
    savedAt: new Date().toISOString(),
  };
}

function reducer(state: GenerateState, action: Action): GenerateState {
  switch (action.type) {
    case "restore":
      return action.state;
    case "brief":
      return { ...state, brief: action.brief };
    case "campaign":
      return { ...state, campaign: { ...state.campaign, ...action.patch } };
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
    case "stockAssetId":
      return { ...state, stockAssetId: action.stockAssetId };
    case "referenceInfluence":
      return { ...state, referenceInfluence: action.influence };
    case "flags":
      return { ...state, flags: action.flags };
    case "brandLogoAssetIds":
      return { ...state, brandLogoAssetIds: action.ids };
    case "addProduct": {
      const existingIndex = state.selectedProducts.findIndex(
        (product) => product.localId === action.product.localId,
      );
      if (existingIndex >= 0) {
        const selectedProducts = [...state.selectedProducts];
        selectedProducts[existingIndex] = action.product;
        return { ...state, selectedProducts };
      }
      return { ...state, selectedProducts: [...state.selectedProducts, action.product] };
    }
    case "removeProduct":
      return {
        ...state,
        selectedProducts: state.selectedProducts.filter(
          (product) => product.localId !== action.localId,
        ),
      };
    case "addVisualReference": {
      const existingIndex = state.visualReferences.findIndex(
        (reference) => reference.localId === action.reference.localId,
      );
      if (existingIndex < 0) {
        return { ...state, visualReferences: [...state.visualReferences, action.reference] };
      }
      const visualReferences = [...state.visualReferences];
      visualReferences[existingIndex] = action.reference;
      return { ...state, visualReferences };
    }
    case "removeVisualReference":
      return {
        ...state,
        visualReferences: state.visualReferences.filter(
          (reference) => reference.localId !== action.localId,
        ),
      };
    case "productRole":
      return {
        ...state,
        selectedProducts: state.selectedProducts.map((product) =>
          product.localId === action.localId ? { ...product, role: action.role } : product,
        ),
      };
    case "composition":
      return { ...state, composition: { ...state.composition, ...action.patch } };
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

  return {
    mode: state.mode,
    creationType: state.creationType,
    ...(state.brandId ? { brandId: state.brandId } : {}),
    moodId: state.moodId,
    stockAssetId: state.stockAssetId,
    inspirationInfluence: state.referenceInfluence,
    inspirationUploadIds: state.visualReferences.flatMap((reference) =>
      reference.uploadId ? [reference.uploadId] : [],
    ),
    brief: state.brief.trim(),
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
  stockAssets: StockAssetLite[];
  credits: number;
  planSegment: "free" | "subscription" | "payg";
  quickCreateV2: boolean;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(props.brands, props.quickCreateV2),
  );
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [promptPreviewLoading, setPromptPreviewLoading] = useState(false);
  const [promptPreview, setPromptPreview] = useState<PromptPreviewResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [moodMode, setMoodMode] = useState<MoodMode>("brand");
  const [moodInfluence, setMoodInfluence] = useState<MoodInfluence>("balanced");
  const [creativePlan, setCreativePlan] = useState<QuickCreatePlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [inlineGeneration, setInlineGeneration] = useState<InlineGeneration | null>(null);
  const [inspectedPrompt, setInspectedPrompt] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"loading" | "saved" | "local" | "error">(
    "loading",
  );
  const draftHydrated = useRef(false);
  const payload = useMemo(() => buildGeneratePayload(state), [state]);
  const isFreePlan = props.planSegment === "free";

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const moodId = search.get("mood");
    if (
      !isFreePlan &&
      moodId &&
      props.moods.some((mood) => mood.id === moodId && mood.entitled !== false)
    ) {
      dispatch({ type: "mood", moodId });
      setMoodMode("selected");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!props.quickCreateV2) return;
    let cancelled = false;
    const hydrate = async () => {
      let local: QuickCreateDraft | null = null;
      try {
        const raw = window.localStorage.getItem("layertone.quick-create-v2.draft");
        local = raw ? parseQuickCreateDraft(JSON.parse(raw)) : null;
      } catch {
        window.localStorage.removeItem("layertone.quick-create-v2.draft");
      }

      let server: QuickCreateDraft | null = null;
      try {
        const response = await fetch("/api/quick-create/draft");
        if (response.ok) {
          const body = (await response.json()) as { payload?: unknown; updatedAt?: string | null };
          server = parseQuickCreateDraft(
            body.payload && typeof body.payload === "object"
              ? { ...body.payload, savedAt: body.updatedAt ?? undefined }
              : null,
          );
        }
      } catch {
        // Local recovery remains available when server sync is unavailable.
      }
      if (cancelled) return;
      const draft = newestDraft(local, server);
      if (draft?.state.mode === "quick") {
        dispatch({
          type: "restore",
          state: {
            ...initialState(props.brands, true),
            ...draft.state,
            selectedProducts: (draft.state.selectedProducts ?? []).filter(
              (product) => product.source !== "upload" || Boolean(product.uploadId),
            ),
            visualReferences: (draft.state.visualReferences ?? []).filter((reference) =>
              Boolean(reference.uploadId),
            ),
            referenceInfluence: draft.state.referenceInfluence ?? "balanced",
          },
        });
        setMoodMode(draft.moodMode === "explore" ? "brand" : draft.moodMode);
        setMoodInfluence(draft.moodInfluence);
      }
      draftHydrated.current = true;
      setDraftStatus(server ? "saved" : "local");
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [props.quickCreateV2]);

  useEffect(() => {
    if (!props.quickCreateV2 || !draftHydrated.current) return;
    const timer = window.setTimeout(() => {
      const draft = serializeQuickCreateDraft(state, moodMode, moodInfluence);
      window.localStorage.setItem(
        "layertone.quick-create-v2.draft",
        JSON.stringify(draft),
      );
      setDraftStatus("local");
      void fetch("/api/quick-create/draft", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: 1, payload: draft }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Draft sync failed");
          setDraftStatus("saved");
        })
        .catch(() => setDraftStatus("error"));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [moodInfluence, moodMode, props.quickCreateV2, state]);

  useEffect(() => {
    if (
      !inlineGeneration ||
      ["completed", "failed", "cancelled"].includes(inlineGeneration.status)
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      fetch(`/api/generations/${inlineGeneration.id}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("Could not refresh generation status");
          return response.json() as Promise<InlineGeneration>;
        })
        .then((generation) => setInlineGeneration(generation))
        .catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [inlineGeneration]);

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
            const json = (await response.json().catch(() => null)) as {
              error?: { message?: string };
            } | null;
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
    state.outputs.variants > 0 &&
    !state.selectedProducts.some(
      (product) =>
        product.source === "upload" &&
        (product.uploadPending || product.uploadFailed || !product.uploadId),
    ) &&
    !state.visualReferences.some(
      (reference) => reference.uploadPending || reference.uploadFailed || !reference.uploadId,
    );
  const canSubmit =
    !pending &&
    !promptPreviewLoading &&
    quickReady &&
    !preflightLoading &&
    (preflight?.blocking.length ?? 0) === 0;

  async function planDirections(clarificationAnswer?: string) {
    if (!quickReady || planning) return;
    setPlanning(true);
    setSubmitError(null);
    try {
      const selectedFormat = state.outputs.formats[0]!;
      const request = clarificationAnswer
        ? `${state.brief.trim()}\n\nClarification answer: ${clarificationAnswer}`
        : state.brief.trim();
      const response = await fetch("/api/quick-create/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          request,
          brandId: state.brandId || null,
          productIds: state.selectedProducts
            .map((product) => product.productId)
            .filter((id): id is string => Boolean(id)),
          attachmentUploadIds: [
            ...state.selectedProducts.flatMap((product) =>
              product.uploadId ? [product.uploadId] : [],
            ),
            ...state.visualReferences.flatMap((reference) =>
              reference.uploadId ? [reference.uploadId] : [],
            ),
          ],
          outputTarget: OUTPUT_FORMAT_TARGETS[selectedFormat],
          sampleCount: state.outputs.variants,
          selectedMoodId: moodMode === "selected" ? state.moodId : null,
          moodInfluence,
          exploreMoods: moodMode === "explore",
          exactCopy: cleanObject({
            title: state.campaign.title,
            subtitle: state.campaign.subtitle,
            price: state.campaign.price,
            discount: state.campaign.discount,
            badgeText: state.campaign.badgeText,
            cta: state.campaign.cta,
            legalText: state.campaign.legalText,
          }),
        }),
      });
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok || !json) throw new Error(apiErrorMessage(json, "Planning failed"));
      const receivedPlan = json as QuickCreatePlan;
      const plan = clarificationAnswer ? { ...receivedPlan, clarification: null } : receivedPlan;
      setCreativePlan(plan);
      trackQuickCreateEvent("directions_planned", {
        variants: plan.variants.length,
        mood_mode: moodMode,
        clarification: Boolean(plan.clarification),
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setPlanning(false);
    }
  }

  async function inspectPrompt() {
    if (promptPreviewLoading) return;
    setPromptPreviewLoading(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/generations/prompt-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildGeneratePayload(state)),
      });
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok || !json) {
        throw new Error(apiErrorMessage(json, "Failed to build prompt"));
      }
      setInspectedPrompt((json as PromptPreviewResult).prompt);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setPromptPreviewLoading(false);
    }
  }

  async function submitV2() {
    if (!creativePlan || !canSubmit || pending) return;
    setPending(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...buildGeneratePayload(state), creativePlan }),
      });
      const raw: unknown = await response.json().catch(() => null);
      if (!response.ok || !raw) throw new Error(apiErrorMessage(raw, "Failed to generate"));
      const json = raw as {
        generationId: string;
        status: string;
        variants: Array<{ id: string; status: string; url?: string | null }>;
      };
      setInlineGeneration({
        id: json.generationId,
        status: json.status,
        variants: json.variants.map((variant) => ({ ...variant, url: variant.url ?? null })),
      });
      window.localStorage.removeItem("layertone.quick-create-v2.draft");
      void fetch("/api/quick-create/draft", { method: "DELETE" }).catch(() => undefined);
      trackQuickCreateEvent("generation_started", {
        format: state.outputs.formats[0],
        quality: state.outputs.quality,
        variants: state.outputs.variants,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
      trackQuickCreateEvent("generation_failed", { stage: "create" });
    } finally {
      setPending(false);
    }
  }

  async function previewPrompt() {
    if (!canSubmit) return;
    trackQuickCreateEvent("generate_requested", {
      format: state.outputs.formats[0],
      quality: state.outputs.quality,
      variants: state.outputs.variants,
      has_product: state.selectedProducts.length > 0,
      has_brand: Boolean(state.brandId),
      has_mood: Boolean(state.moodId),
    });
    setPromptPreviewLoading(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/generations/prompt-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildGeneratePayload(state)),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(json?.error?.message ?? "Failed to build prompt preview");
      }
      setPromptPreview((await response.json()) as PromptPreviewResult);
      trackQuickCreateEvent("prompt_preview_opened", {
        format: state.outputs.formats[0],
        quality: state.outputs.quality,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
      trackQuickCreateEvent("generation_failed", { stage: "prompt_preview" });
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
        const json = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(json?.error?.message ?? "Failed to generate");
      }
      const json = (await response.json()) as { generationId: string };
      trackQuickCreateEvent("generation_started", {
        format: state.outputs.formats[0],
        quality: state.outputs.quality,
        variants: state.outputs.variants,
      });
      router.push(`/generations/${json.generationId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
      trackQuickCreateEvent("generation_failed", { stage: "create" });
      setPending(false);
    }
  }

  if (props.quickCreateV2) {
    return (
      <div className="cg-page cg-page--v2">
        <div className="cg-header cg-header--v2">
          <div>
            <span className="cg-kicker">Quick Create</span>
            <h1>Start with the idea.</h1>
            <p>
              Add product references and context only when they help. Your draft saves to this
              device and workspace automatically.
            </p>
          </div>
          <div className="qc2-header-status">
            <span className="qc2-draft-status" aria-live="polite">
              {draftStatus === "loading"
                ? "Restoring draft…"
                : draftStatus === "saved"
                  ? "Draft synced"
                  : draftStatus === "error"
                    ? "Saved on this device"
                    : "Saving draft…"}
            </span>
            <span className="qc2-credit-balance">{props.credits} credits</span>
          </div>
        </div>
        <QuickCreateV2
          state={state}
          brands={props.brands}
          moods={props.moods}
          products={props.products}
          stockAssets={props.stockAssets}
          planSegment={props.planSegment}
          moodMode={moodMode}
          moodInfluence={moodInfluence}
          plan={creativePlan}
          planning={planning}
          pending={pending}
          promptPreviewLoading={promptPreviewLoading}
          promptPreview={inspectedPrompt}
          preflight={preflight}
          preflightLoading={preflightLoading}
          error={preflightError ?? submitError}
          generation={inlineGeneration}
          canPlan={quickReady && !planning && !preflightLoading}
          canGenerate={canSubmit && Boolean(creativePlan)}
          onBriefChange={(brief) => dispatch({ type: "brief", brief })}
          onCampaignChange={(patch) => dispatch({ type: "campaign", patch })}
          onAddProduct={(product) => {
            dispatch({ type: "addProduct", product });
            setCreativePlan(null);
          }}
          onRemoveProduct={(localId) => {
            dispatch({ type: "removeProduct", localId });
            setCreativePlan(null);
          }}
          onAddVisualReference={(reference) => {
            dispatch({ type: "addVisualReference", reference });
            setCreativePlan(null);
          }}
          onRemoveVisualReference={(localId) => {
            dispatch({ type: "removeVisualReference", localId });
            setCreativePlan(null);
          }}
          onProductRoleChange={(localId, role) => dispatch({ type: "productRole", localId, role })}
          onBrandChange={(brandId) => {
            dispatch({ type: "brand", brandId });
            setCreativePlan(null);
          }}
          onMoodModeChange={(mode) => {
            setMoodMode(mode);
            setCreativePlan(null);
          }}
          onMoodChange={(moodId) => {
            dispatch({ type: "mood", moodId });
            setCreativePlan(null);
          }}
          onMoodInfluenceChange={(influence) => {
            setMoodInfluence(influence);
            setCreativePlan(null);
          }}
          onOutputsChange={(outputs) => {
            dispatch({
              type: "outputs",
              outputs: isFreePlan ? { ...outputs, quality: "standard" } : outputs,
            });
            setCreativePlan(null);
          }}
          onCompositionChange={(patch) => dispatch({ type: "composition", patch })}
          onStockAssetChange={(id) => dispatch({ type: "stockAssetId", stockAssetId: id })}
          onReferenceInfluenceChange={(influence) =>
            dispatch({ type: "referenceInfluence", influence })
          }
          onPlan={(answer) => void planDirections(answer)}
          onGenerate={() => void submitV2()}
          onResetPlan={() => setCreativePlan(null)}
          onAcceptMood={(moodId) => {
            setMoodMode("selected");
            dispatch({ type: "mood", moodId });
            setCreativePlan(null);
          }}
          onInspectPrompt={() => void inspectPrompt()}
        />
      </div>
    );
  }

  return (
    <div className="cg-page">
      <div className="cg-header">
        <div>
          <span className="cg-kicker">New generation</span>
          <h1>Quick Create</h1>
          <p>Turn an idea into polished, product-aware images for social and digital channels.</p>
        </div>
      </div>

      <div className="cg-workspace">
        <main>
          <QuickCreate
            state={state}
            brands={props.brands}
            moods={props.moods}
            products={props.products}
            stockAssets={props.stockAssets}
            planSegment={props.planSegment}
            onBriefChange={(brief) => dispatch({ type: "brief", brief })}
            onCampaignChange={(patch) => dispatch({ type: "campaign", patch })}
            onAddProduct={(product) => dispatch({ type: "addProduct", product })}
            onRemoveProduct={(localId) => dispatch({ type: "removeProduct", localId })}
            onProductRoleChange={(localId, role) =>
              dispatch({ type: "productRole", localId, role })
            }
            onBrandChange={(brandId) => dispatch({ type: "brand", brandId })}
            onMoodChange={(moodId) => {
              if (!isFreePlan) dispatch({ type: "mood", moodId });
            }}
            onFlagsChange={(flags) => dispatch({ type: "flags", flags })}
            onStockAssetChange={(id) => dispatch({ type: "stockAssetId", stockAssetId: id })}
            onBrandLogoAssetIdsChange={(ids) => dispatch({ type: "brandLogoAssetIds", ids })}
            onOutputsChange={(outputs) =>
              dispatch({
                type: "outputs",
                outputs: isFreePlan ? { ...outputs, quality: "standard" } : outputs,
              })
            }
          />
        </main>

        <ReviewRail
          state={state}
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [props.onClose]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(props.preview.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <div className="scrim" aria-hidden="true" onClick={props.onClose} />
      <div
        className="modal cg-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-preview-title"
      >
        <div className="cg-prompt-modal__head">
          <div>
            <span className="cg-kicker">OpenAI prompt preview</span>
            <h2 id="prompt-preview-title">Prompt sent to image model</h2>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-label="Close prompt preview"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>

        <div className="cg-prompt-meta">
          <span>
            {props.preview.templatePath} v{props.preview.templateVersion}
          </span>
          <span>
            {props.preview.outputTarget.platform ?? "image"} /{" "}
            {props.preview.outputTarget.format ?? props.preview.outputTarget.aspectRatio}
          </span>
          <span>
            {props.preview.outputTarget.width} × {props.preview.outputTarget.height}
          </span>
          {props.preview.generationTemplate ? (
            <span>{props.preview.generationTemplate.name}</span>
          ) : null}
        </div>

        <section className="cg-prompt-block">
          <div className="cg-prompt-block__title">
            <strong>Prompt</strong>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void copyPrompt()}
            >
              {copied ? "Copied" : "Copy Prompt"}
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
          <div className="cg-submit-error" aria-live="polite" style={{ margin: "0 0 4px" }}>
            {props.error}
          </div>
        ) : null}
        <div className="cg-prompt-modal__foot">
          <button type="button" className="btn btn--ghost" onClick={props.onClose}>
            Back to Edit
          </button>
          <button
            type="button"
            className="btn btn--accent"
            disabled={props.pending}
            onClick={props.onGenerate}
          >
            {props.pending ? "Generating…" : "Start Generation"}
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

function apiErrorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : fallback;
}
