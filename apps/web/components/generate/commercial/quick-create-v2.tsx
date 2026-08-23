"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { QuickCreatePlan } from "@layertone/shared/generation/quick-create-v2";

import { I } from "@/components/icons";
import { trackQuickCreateEvent } from "@/lib/quick-create-events";

import { ProductPicker } from "./product-picker";
import type {
  BrandLite,
  CampaignDetails,
  GenerateState,
  MoodLite,
  OutputFormat,
  OutputSettings,
  ProductLite,
  ProductRole,
  PreflightResult,
  SelectedProduct,
  StockAssetLite,
} from "./types";

export type MoodMode = "brand" | "suggested" | "selected" | "explore";
export type MoodInfluence = "subtle" | "balanced" | "strong";

export interface InlineGeneration {
  id: string;
  status: string;
  variants: Array<{ id: string; status: string; url: string | null }>;
}

const FORMAT_OPTIONS: Array<{ id: OutputFormat; label: string; detail: string; ratio: string }> = [
  { id: "instagram_square", label: "Instagram post", detail: "Square", ratio: "1:1" },
  {
    id: "instagram_portrait",
    label: "Instagram post",
    detail: "Portrait",
    ratio: "4:5",
  },
  { id: "instagram_story", label: "Instagram Story", detail: "Full screen", ratio: "9:16" },
  {
    id: "instagram_reel",
    label: "Reel cover",
    detail: "Static cover image",
    ratio: "9:16",
  },
  { id: "facebook_feed", label: "Facebook feed", detail: "Landscape", ratio: "1.91:1" },
  { id: "linkedin_feed", label: "LinkedIn post", detail: "Landscape", ratio: "1.91:1" },
  {
    id: "tiktok_vertical",
    label: "TikTok cover",
    detail: "Static cover image",
    ratio: "9:16",
  },
  { id: "website_banner", label: "Website banner", detail: "Wide", ratio: "16:9" },
  { id: "product_card", label: "Product card", detail: "Square", ratio: "1:1" },
  { id: "print_leaflet_a4", label: "A4 leaflet", detail: "Print portrait", ratio: "4:5" },
];

export function QuickCreateV2(props: {
  state: GenerateState;
  brands: BrandLite[];
  moods: MoodLite[];
  products: ProductLite[];
  stockAssets: StockAssetLite[];
  planSegment: "free" | "subscription" | "payg";
  moodMode: MoodMode;
  moodInfluence: MoodInfluence;
  plan: QuickCreatePlan | null;
  planning: boolean;
  pending: boolean;
  promptPreviewLoading: boolean;
  promptPreview: string | null;
  preflight: PreflightResult | null;
  preflightLoading: boolean;
  error: string | null;
  generation: InlineGeneration | null;
  canPlan: boolean;
  canGenerate: boolean;
  onBriefChange: (brief: string) => void;
  onCampaignChange: (patch: Partial<CampaignDetails>) => void;
  onAddProduct: (product: SelectedProduct) => void;
  onRemoveProduct: (localId: string) => void;
  onAddVisualReference: (reference: GenerateState["visualReferences"][number]) => void;
  onRemoveVisualReference: (localId: string) => void;
  onProductRoleChange: (localId: string, role: ProductRole) => void;
  onBrandChange: (brandId: string) => void;
  onMoodModeChange: (mode: MoodMode) => void;
  onMoodChange: (moodId: string | null) => void;
  onMoodInfluenceChange: (influence: MoodInfluence) => void;
  onOutputsChange: (outputs: OutputSettings) => void;
  onCompositionChange: (patch: Partial<GenerateState["composition"]>) => void;
  onStockAssetChange: (id: string | null) => void;
  onReferenceInfluenceChange: (influence: GenerateState["referenceInfluence"]) => void;
  onPlan: (clarificationAnswer?: string) => void;
  onGenerate: () => void;
  onResetPlan: () => void;
  onAcceptMood: (moodId: string) => void;
  onInspectPrompt: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [moodSearch, setMoodSearch] = useState("");
  const [moodBrowserOpen, setMoodBrowserOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [clarificationAnswer, setClarificationAnswer] = useState("");

  const brand = props.brands.find((item) => item.id === props.state.brandId);
  const selectedMood = props.moods.find((item) => item.id === props.state.moodId);
  const format =
    FORMAT_OPTIONS.find((item) => item.id === props.state.outputs.formats[0]) ?? FORMAT_OPTIONS[0]!;
  const filteredMoods = useMemo(() => {
    const query = moodSearch.trim().toLowerCase();
    if (!query) return props.moods;
    return props.moods.filter((mood) => `${mood.name} ${mood.kind}`.toLowerCase().includes(query));
  }, [moodSearch, props.moods]);

  useEffect(() => {
    if (!moodBrowserOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMoodBrowserOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [moodBrowserOpen]);

  async function uploadFiles(files: FileList | File[]) {
    const remaining = Math.max(0, 2 - props.state.visualReferences.length);
    if (remaining === 0) {
      setUploadError(
        "Quick Create supports up to two visual references. Remove one to replace it.",
      );
      return;
    }
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith("image/")) continue;
      setUploadError(null);
      const localId = `upload-${crypto.randomUUID()}`;
      const previewUrl = URL.createObjectURL(file);
      const name = file.name.replace(/\.[^.]+$/, "");
      props.onAddVisualReference({
        localId,
        previewUrl,
        name,
        uploadPending: true,
      });
      trackQuickCreateEvent("upload_started", { source: "composer" });
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await fetch("/api/uploads/inspiration", {
          method: "POST",
          body: formData,
        });
        const json = (await response.json().catch(() => null)) as { uploadId?: string } | null;
        if (!response.ok || !json?.uploadId) throw new Error("Upload failed");
        props.onAddVisualReference({
          localId,
          uploadId: json.uploadId,
          previewUrl,
          name,
          uploadPending: false,
        });
        trackQuickCreateEvent("upload_completed", { source: "composer" });
      } catch {
        props.onAddVisualReference({
          localId,
          previewUrl,
          name,
          uploadPending: false,
          uploadFailed: true,
        });
        setUploadError(`${file.name} could not be uploaded. Remove it or try again.`);
        trackQuickCreateEvent("upload_failed", { source: "composer" });
      }
    }
  }

  return (
    <div className="qc2">
      <section
        className={`qc2-composer ${dragging ? "is-dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void uploadFiles(event.dataTransfer.files);
        }}
      >
        <label className="qc2-composer__label" htmlFor="quick-create-brief">
          What do you want to create?
        </label>
        <textarea
          id="quick-create-brief"
          className="qc2-composer__input"
          value={props.state.brief}
          maxLength={4000}
          placeholder="A clean launch image for our new coffee blend, warm morning light, with the pack clearly visible…"
          onChange={(event) => {
            props.onBriefChange(event.target.value);
            if (props.plan) props.onResetPlan();
          }}
        />

        {props.state.visualReferences.length > 0 ? (
          <div className="qc2-attachments" aria-label="Attached visual references">
            {props.state.visualReferences.map((reference) => (
              <span className="qc2-attachment" key={reference.localId}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {reference.previewUrl ? <img src={reference.previewUrl} alt="" /> : <I.Image size={20} />}
                <span>{reference.name}</span>
                {reference.uploadPending ? <small>Uploading…</small> : null}
                {reference.uploadFailed ? <small className="qc2-error">Failed</small> : null}
                <button
                  type="button"
                  aria-label={`Remove ${reference.name}`}
                  onClick={() => props.onRemoveVisualReference(reference.localId)}
                >
                  <I.X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="qc2-composer__foot">
          <div>
            <input
              ref={fileRef}
              className="cg-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              aria-label="Visual reference image files"
              onChange={(event) => {
                if (event.target.files) void uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="qc2-icon-button"
              aria-label="Attach visual reference images"
              onClick={() => fileRef.current?.click()}
            >
              <I.Upload size={17} />
              <span>Attach reference</span>
            </button>
            <small className="qc2-attachment-limit">
              {props.state.visualReferences.length}/2 references
            </small>
          </div>
          <span>{props.state.brief.length}/4000</span>
        </div>
      </section>

      {uploadError ? (
        <div className="qc2-inline-error" role="alert">
          {uploadError}
        </div>
      ) : null}

      <div className="qc2-context" aria-label="Creation context">
        <ContextPicker label="Brand" value={brand?.name ?? "No brand"}>
          <div className="qc2-picker-list" role="listbox" aria-label="Choose brand">
            <PickerButton
              selected={!props.state.brandId}
              title="No brand"
              detail="Create without a saved brand kit"
              onClick={() => props.onBrandChange("")}
            />
            {props.brands.map((item) => (
              <PickerButton
                key={item.id}
                selected={item.id === props.state.brandId}
                title={item.name}
                detail={item.palette?.length ? `${item.palette.length} saved colors` : "Brand kit"}
                colors={item.palette ?? []}
                onClick={() => props.onBrandChange(item.id)}
              />
            ))}
          </div>
        </ContextPicker>

        <ContextPicker
          label="Product"
          value={
            props.state.selectedProducts.length
              ? `${props.state.selectedProducts.length} selected`
              : "Add product"
          }
          wide
        >
          <ProductPicker
            products={props.products}
            selected={props.state.selectedProducts}
            onAdd={props.onAddProduct}
            onRemove={props.onRemoveProduct}
            onUpdateRole={props.onProductRoleChange}
          />
        </ContextPicker>

        <ContextPicker label="Format" value={`${format.label} · ${format.ratio}`} wide>
          <div className="qc2-format-grid" role="radiogroup" aria-label="Output format">
            {FORMAT_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={item.id === format.id}
                className={item.id === format.id ? "is-selected" : ""}
                onClick={() => {
                  props.onOutputsChange({ ...props.state.outputs, formats: [item.id] });
                  props.onResetPlan();
                }}
              >
                <span className={`qc2-ratio qc2-ratio--${ratioClass(item.ratio)}`} />
                <span>
                  <strong>{item.label}</strong>
                  <small>
                    {item.detail} · {item.ratio}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </ContextPicker>
      </div>

      <section className="qc2-direction-panel" aria-labelledby="qc2-direction-title">
        <div className="qc2-direction-panel__head">
          <div>
            <span className="qc2-kicker">Visual direction</span>
            <h2 id="qc2-direction-title">Choose how the work should feel</h2>
            <p>Preview a mood at a useful size, or let AI suggest compatible directions.</p>
          </div>
          <span className="qc2-direction-current">
            <small>Current direction</small>
            <strong>{directionLabel(props.moodMode, selectedMood?.name)}</strong>
          </span>
        </div>

        <div className="qc2-direction-panel__body">
          <div className="qc2-direction-modes" aria-label="Creative direction">
            <PickerButton
              role="button"
              selected={props.moodMode === "brand"}
              title="Just my brand"
              detail="Use the brief and brand kit without a mood recipe"
              onClick={() => {
                props.onMoodModeChange("brand");
                props.onMoodChange(null);
              }}
            />
            <PickerButton
              role="button"
              selected={props.moodMode === "suggested"}
              title="AI suggested"
              detail="Let the planner recommend the best eligible direction"
              onClick={() => {
                props.onMoodModeChange("suggested");
                props.onMoodChange(null);
              }}
            />
            <PickerButton
              role="button"
              selected={props.moodMode === "selected"}
              title="Explore moods"
              detail="Open the visual library and choose a curated mood"
              onClick={() => setMoodBrowserOpen(true)}
            />
          </div>
        </div>
      </section>

      {moodBrowserOpen ? (
        <div
          className="qc2-mood-browser-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setMoodBrowserOpen(false);
          }}
        >
          <section
            className="qc2-mood-browser"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qc2-mood-browser-title"
          >
            <div className="qc2-mood-browser__head">
              <div>
                <span className="qc2-kicker">Mood Library</span>
                <h2 id="qc2-mood-browser-title">Choose a visual direction</h2>
                <p>
                  These previews show the atmosphere, color, and photographic treatment that will
                  guide generation.
                </p>
              </div>
              <button
                type="button"
                className="btn btn--secondary"
                autoFocus
                onClick={() => setMoodBrowserOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="qc2-mood-browser__tools">
              <label className="qc2-search">
                <I.Search size={17} />
                <span className="sr-only">Search moods</span>
                <input
                  value={moodSearch}
                  placeholder="Search moods by name or style"
                  onChange={(event) => setMoodSearch(event.target.value)}
                />
              </label>
              <span>{filteredMoods.length} directions</span>
            </div>

            <div className="qc2-mood-browser__scroll">
              <div className="qc2-mood-grid">
                {filteredMoods.map((mood) => {
                  const compatible =
                    !mood.supportedAspectRatios?.length ||
                    mood.supportedAspectRatios.includes(format.ratio);
                  const locked = mood.entitled === false;
                  return (
                    <button
                      key={mood.id}
                      type="button"
                      disabled={locked || !compatible}
                      aria-pressed={props.state.moodId === mood.id}
                      className={props.state.moodId === mood.id ? "is-selected" : ""}
                      onClick={() => {
                        props.onMoodModeChange("selected");
                        props.onMoodChange(mood.id);
                        setMoodBrowserOpen(false);
                      }}
                    >
                      <span className="qc2-mood-card__image">
                        {mood.img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mood.img} alt={`${mood.name} visual direction preview`} />
                        ) : (
                          <span style={{ background: moodPreviewGradient(mood.colors) }} />
                        )}
                        <span className="qc2-mood-card__badge">
                          {props.state.moodId === mood.id
                            ? "Selected"
                            : locked
                              ? "Locked"
                              : moodGroupLabel(mood.group)}
                        </span>
                      </span>
                      <span>
                        <strong>{mood.name}</strong>
                        <small>
                          {locked
                            ? "Upgrade to use"
                            : compatible
                              ? `${moodGroupLabel(mood.group)} · works with ${format.ratio}`
                              : `Not available for ${format.ratio}`}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
              {filteredMoods.length === 0 ? (
                <div className="qc2-mood-browser__empty">No moods match that search.</div>
              ) : null}
            </div>

            <div className="qc2-mood-browser__foot">
              <fieldset className="qc2-influence">
                <legend>Mood influence</legend>
                {(["subtle", "balanced", "strong"] as const).map((item) => (
                  <label key={item}>
                    <input
                      type="radio"
                      name="mood-influence"
                      checked={props.moodInfluence === item}
                      onChange={() => props.onMoodInfluenceChange(item)}
                    />
                    {capitalize(item)}
                  </label>
                ))}
              </fieldset>
              {selectedMood ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    props.onMoodModeChange("brand");
                    props.onMoodChange(null);
                    setMoodBrowserOpen(false);
                  }}
                >
                  Remove selected mood
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      <details
        className="qc2-advanced"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
      >
        <summary>
          <span>
            <I.Settings size={16} /> Advanced controls
          </span>
          <I.ChevronDown size={16} />
        </summary>
        <div className="qc2-advanced__body">
          <label>
            Variants
            <select
              className="select"
              value={props.state.outputs.variants}
              onChange={(event) =>
                props.onOutputsChange({
                  ...props.state.outputs,
                  variants: Number(event.target.value) as 1 | 2 | 3 | 4,
                })
              }
            >
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model &amp; quality
            <select
              className="select"
              value={props.state.outputs.quality}
              onChange={(event) =>
                props.onOutputsChange({
                  ...props.state.outputs,
                  quality:
                    props.planSegment === "free"
                      ? "standard"
                      : (event.target.value as "standard" | "premium"),
                })
              }
            >
              <option value="standard">Standard</option>
              <option value="premium" disabled={props.planSegment === "free"}>
                Premium{props.planSegment === "free" ? " · upgrade" : ""}
              </option>
            </select>
          </label>
          <label>
            Product reference strength
            <select
              className="select"
              value={props.state.referenceInfluence}
              onChange={(event) =>
                props.onReferenceInfluenceChange(
                  event.target.value as GenerateState["referenceInfluence"],
                )
              }
            >
              <option value="subtle">Subtle</option>
              <option value="balanced">Balanced</option>
              <option value="strong">Strong</option>
            </select>
          </label>
          <label>
            Product placement
            <select
              className="select"
              value={props.state.composition.productPosition}
              onChange={(event) =>
                props.onCompositionChange({
                  productPosition: event.target
                    .value as GenerateState["composition"]["productPosition"],
                })
              }
            >
              <option value="template">Let the planner decide</option>
              <option value="center">Center</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>
          <label>
            Background
            <select
              className="select"
              value={props.state.composition.backgroundStyle}
              onChange={(event) =>
                props.onCompositionChange({
                  backgroundStyle: event.target
                    .value as GenerateState["composition"]["backgroundStyle"],
                })
              }
            >
              <option value="studio">Studio</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="abstract">Abstract</option>
              <option value="seasonal">Seasonal</option>
              <option value="marketplace_white">Marketplace white</option>
              <option value="transparent">Transparent</option>
            </select>
          </label>
          <label>
            Exact headline
            <input
              className="input"
              value={props.state.campaign.title}
              placeholder="Rendered exactly; leave blank for none"
              onChange={(event) => props.onCampaignChange({ title: event.target.value })}
            />
          </label>
          <label>
            Exact CTA
            <input
              className="input"
              value={props.state.campaign.cta}
              placeholder="Shop now"
              onChange={(event) => props.onCampaignChange({ cta: event.target.value })}
            />
          </label>
          <p className="qc2-advanced__wide qc2-campaign-link">
            Need a coordinated set with dates, channels, and multiple assets? Use the{" "}
            <a href="/campaigns/new">Campaign builder</a>.
          </p>
          <label className="qc2-advanced__wide">
            Certification overlay
            <select
              className="select"
              value={props.state.stockAssetId ?? ""}
              onChange={(event) => props.onStockAssetChange(event.target.value || null)}
            >
              <option value="">None</option>
              {props.stockAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>
          </label>
          <div className="qc2-advanced__wide qc2-prompt-inspection">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={props.promptPreviewLoading || !props.state.brief.trim()}
              onClick={props.onInspectPrompt}
            >
              <I.Eye size={15} />
              {props.promptPreviewLoading ? "Building prompt…" : "Inspect model prompt"}
            </button>
            {props.promptPreview ? <pre>{props.promptPreview}</pre> : null}
          </div>
        </div>
      </details>

      {props.plan?.clarification ? (
        <section className="qc2-clarification" aria-labelledby="qc2-clarification-title">
          <span className="qc2-kicker">One detail will improve the result</span>
          <h2 id="qc2-clarification-title">{props.plan.clarification.question}</h2>
          <p>{props.plan.clarification.reason}</p>
          <div>
            <input
              className="input"
              value={clarificationAnswer}
              placeholder="Your answer"
              autoFocus
              onChange={(event) => setClarificationAnswer(event.target.value)}
            />
            <button
              type="button"
              className="btn btn--accent"
              disabled={!clarificationAnswer.trim() || props.planning}
              onClick={() => props.onPlan(clarificationAnswer.trim())}
            >
              Update directions
            </button>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={props.onGenerate}>
            Use my brief as written
          </button>
        </section>
      ) : null}

      {props.plan && !props.plan.clarification ? (
        <section className="qc2-plan" aria-labelledby="qc2-plan-title">
          <div className="qc2-plan__head">
            <div>
              <span className="qc2-kicker">Creative directions</span>
              <h2 id="qc2-plan-title">Distinct routes, grounded in your brief</h2>
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={props.onResetPlan}>
              Edit setup
            </button>
          </div>
          <div className="qc2-plan-grid">
            {props.plan.variants.map((variant) => (
              <article key={variant.index}>
                <span>{variant.label}</span>
                <h3>{variant.concept}</h3>
                <dl>
                  <div>
                    <dt>Composition</dt>
                    <dd>{variant.composition}</dd>
                  </div>
                  <div>
                    <dt>Light</dt>
                    <dd>{variant.lighting}</dd>
                  </div>
                  <div>
                    <dt>Art direction</dt>
                    <dd>{variant.artDirection}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          {props.moodMode === "suggested" && props.plan.moodRecommendations.length > 0 ? (
            <div className="qc2-recommendations">
              {props.plan.moodRecommendations.map((item) => {
                const mood = props.moods.find((candidate) => candidate.id === item.moodId);
                return (
                  <div className="qc2-recommendation" key={item.moodId}>
                    <I.Sparkle size={15} />
                    <span>
                      <strong>{mood?.name ?? "Suggested mood"}</strong>
                      {item.reason}
                    </span>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => props.onAcceptMood(item.moodId)}
                    >
                      Use mood
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {props.preflight?.blocking.length ? (
        <div className="qc2-inline-error" role="alert">
          {props.preflight.blocking.map((issue) => issue.message).join(" ")}
        </div>
      ) : null}
      {props.error ? (
        <div className="qc2-inline-error" role="alert">
          {props.error}
        </div>
      ) : null}

      <div className="qc2-actionbar">
        <div>
          <strong>
            {props.preflightLoading
              ? "Checking setup…"
              : props.preflight?.estimate
                ? `${props.preflight.estimate.credits} credits estimated`
                : `${props.state.outputs.variants} ${props.state.outputs.variants === 1 ? "image" : "images"}`}
          </strong>
          <span>
            {props.plan && !props.plan.clarification
              ? "Directions are ready. Credits are spent only when generation starts."
              : "Plan first, review the directions, then generate."}
          </span>
        </div>
        {props.plan && !props.plan.clarification ? (
          <button
            type="button"
            className="btn btn--accent qc2-primary"
            disabled={!props.canGenerate}
            onClick={props.onGenerate}
          >
            <I.Sparkle size={17} />
            {props.pending ? "Starting…" : `Generate ${props.state.outputs.variants}`}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--accent qc2-primary"
            disabled={!props.canPlan}
            onClick={() => props.onPlan()}
          >
            <I.Wand size={17} />
            {props.planning ? "Planning…" : "Plan directions"}
          </button>
        )}
      </div>

      {props.generation ? <InlineResults generation={props.generation} /> : null}
    </div>
  );
}

function ContextPicker(props: {
  label: string;
  value: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <details
      ref={detailsRef}
      className={`qc2-context-picker ${props.wide ? "is-wide" : ""}`}
      open={open}
    >
      <summary
        onClick={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        <span>{props.label}</span>
        <strong>{props.value}</strong>
        <I.ChevronDown size={14} />
      </summary>
      <div
        className="qc2-context-picker__panel"
        onClick={(event) => {
          if ((event.target as Element).closest("button")) setOpen(false);
        }}
      >
        {props.children}
      </div>
    </details>
  );
}

function PickerButton(props: {
  selected: boolean;
  title: string;
  detail: string;
  colors?: string[];
  role?: "option" | "radio" | "button";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={props.role === "button" ? undefined : (props.role ?? "option")}
      {...(props.role === "radio"
        ? { "aria-checked": props.selected }
        : props.role === "button"
          ? { "aria-pressed": props.selected }
          : { "aria-selected": props.selected })}
      className={props.selected ? "is-selected" : ""}
      onClick={props.onClick}
    >
      {props.colors?.length ? (
        <span className="qc2-swatches">
          {props.colors.slice(0, 4).map((color) => (
            <i key={color} style={{ background: color }} />
          ))}
        </span>
      ) : (
        <span className="qc2-picker-icon">
          <I.Palette size={16} />
        </span>
      )}
      <span>
        <strong>{props.title}</strong>
        <small>{props.detail}</small>
      </span>
      {props.selected ? <I.Check size={16} /> : null}
    </button>
  );
}

function InlineResults(props: { generation: InlineGeneration }) {
  const complete = props.generation.variants.filter(
    (variant) => variant.status === "completed",
  ).length;
  const terminal = ["completed", "failed", "cancelled"].includes(props.generation.status);
  return (
    <section className="qc2-results" aria-live="polite" aria-labelledby="qc2-results-title">
      <div className="qc2-plan__head">
        <div>
          <span className="qc2-kicker">Generation workspace</span>
          <h2 id="qc2-results-title">
            {terminal
              ? "Your images"
              : `Creating images · ${complete}/${props.generation.variants.length}`}
          </h2>
        </div>
        <a className="btn btn--secondary btn--sm" href={`/generations/${props.generation.id}`}>
          Open full editor <I.ArrowRight size={14} />
        </a>
      </div>
      <div className="qc2-results-grid">
        {props.generation.variants.map((variant, index) => (
          <article key={variant.id}>
            {variant.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={variant.url} alt={`Generated variant ${index + 1}`} />
            ) : (
              <div className="qc2-result-placeholder">
                {variant.status === "failed" || variant.status === "failed_safety" ? (
                  <span>Variant failed</span>
                ) : (
                  <>
                    <span className="spinner" />
                    <span>{variant.status === "running" ? "Creating…" : "Queued"}</span>
                  </>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function directionLabel(mode: MoodMode, selected?: string) {
  if (mode === "selected") return selected ?? "Selected mood";
  if (mode === "suggested") return "AI suggested";
  if (mode === "explore") return "Explore moods";
  return "Just my brand";
}

function ratioClass(ratio: string) {
  return ratio.replace(":", "-").replace(".", "_");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function moodGroupLabel(group: MoodLite["group"]) {
  if (group === "now") return "Right now";
  if (group === "soon") return "Seasonal soon";
  return "Evergreen";
}

function moodPreviewGradient(colors?: string[]) {
  const first = colors?.[0] ?? "#e8e4dc";
  const second = colors?.[1] ?? "#b7b1c9";
  const third = colors?.[2] ?? "#f4eee2";
  return `linear-gradient(135deg, ${first}, ${second} 52%, ${third})`;
}
