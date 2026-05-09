"use client";

import { I } from "@/components/icons";

import { PreflightPanel } from "./preflight-panel";
import type { GenerateState, PreflightResult } from "./types";

const FORMAT_LABELS: Record<string, string> = {
  instagram_square: "Instagram square 1080 × 1080",
  instagram_portrait: "Instagram portrait 1080 × 1350",
  instagram_landscape: "Instagram landscape 1080 × 566",
  instagram_story: "Instagram story 1080 × 1920",
  instagram_reel: "Instagram reel 1080 × 1920",
  instagram_feed_video_portrait: "Instagram feed video 1080 × 1350",
  instagram_feed_video_square: "Instagram feed video 1080 × 1080",
  facebook_feed: "Facebook feed 1200 × 630",
  facebook_square: "Facebook square 1080 × 1080",
  facebook_portrait: "Facebook portrait 1080 × 1350",
  facebook_landscape: "Facebook landscape 1080 × 566",
  facebook_link_preview: "Facebook link preview 1200 × 630",
  facebook_profile_photo: "Facebook profile photo 320 × 320",
  facebook_cover_photo: "Facebook cover photo 820 × 360",
  facebook_story: "Facebook story 1080 × 1920",
  linkedin_feed: "LinkedIn standard 1200 × 627",
  tiktok_vertical: "TikTok vertical 1080 × 1920",
  website_banner: "Website banner",
  product_card: "Product card",
  ad_creative: "Ad creative",
  print_leaflet_a4: "A4 leaflet",
};

const CREATION_LABELS: Record<string, string> = {
  single_product: "Single product",
  product_bundle: "Product bundle",
  campaign_set: "Campaign set",
  leaflet_catalogue: "Leaflet catalogue",
  comparison: "Comparison",
  social_ad_pack: "Social ad pack",
};

function completion(state: GenerateState) {
  const checks = state.mode === "quick"
    ? [
        state.outputs.formats.length > 0,
        state.brief.trim().length > 0,
        Boolean(state.outputs.quality),
        state.outputs.variants > 0,
      ]
    : [
        state.brandId.length > 0,
        state.selectedProducts.length > 0,
        state.brief.trim().length > 0,
        state.template.family.length > 0 && state.template.layout.length > 0,
        state.outputs.formats.length > 0,
      ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function hasCampaignDetails(state: GenerateState) {
  return Object.values(state.campaign).some((value) =>
    typeof value === "string" ? value.trim().length > 0 : Boolean(value),
  );
}

function campaignLabel(state: GenerateState) {
  if (state.mode === "quick" && !hasCampaignDetails(state)) return "Not selected";
  return CREATION_LABELS[state.creationType] ?? "Not selected";
}

export function ReviewRail(props: {
  state: GenerateState;
  credits: number;
  preflight: PreflightResult | null;
  preflightLoading: boolean;
  preflightError: string | null;
  submitError: string | null;
  pending: boolean;
  promptPreviewLoading?: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  const percent = completion(props.state);
  const estimate = props.preflight?.estimate;
  const selected = props.state.selectedProducts.slice(0, 4);

  return (
    <aside className="cg-rail" aria-label="Generation review">
      <div className="cg-rail-card">
        <div className="cg-rail-head">
          <div>
            <span className="cg-kicker">Readiness</span>
            <strong>{percent}% complete</strong>
          </div>
          <span className="pill pill--ring">{props.credits} credits</span>
        </div>
        <div className="cg-progress"><span style={{ width: `${percent}%` }} /></div>
      </div>

      <div className="cg-rail-card">
        <span className="cg-kicker">Products</span>
        {selected.length ? (
          <div className="cg-rail-products">
            {selected.map((product) => (
              <div key={product.localId}>
                <span className="cg-mini-thumb">
                  {product.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.previewUrl} alt="" />
                  ) : (
                    (product.commercialFields.name ?? "P").slice(0, 1).toUpperCase()
                  )}
                </span>
                <span>{product.commercialFields.title ?? product.commercialFields.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="cg-muted">No product selected.</p>
        )}
      </div>

      <div className="cg-rail-card">
        <span className="cg-kicker">Campaign</span>
        <strong>{campaignLabel(props.state)}</strong>
        <p className="cg-muted">
          {props.state.template.family.replaceAll("_", " ")} / {props.state.template.layout.replaceAll("_", " ")}
        </p>
      </div>

      <div className="cg-rail-card">
        <span className="cg-kicker">Formats</span>
        <div className="cg-chip-wrap">
          {props.state.outputs.formats.map((format) => (
            <span className="pill pill--ring" key={format}>{FORMAT_LABELS[format]}</span>
          ))}
        </div>
      </div>

      <div className="cg-rail-card">
        <span className="cg-kicker">Preflight</span>
        <PreflightPanel preflight={props.preflight} loading={props.preflightLoading} error={props.preflightError} />
      </div>

      <div className="cg-rail-card">
        <span className="cg-kicker">Estimate</span>
        <div className="cg-estimate-total">
          <strong>{estimate?.credits ?? 0}</strong>
          <span>credits</span>
        </div>
        <div className="cg-line-items">
          {(estimate?.lineItems ?? []).map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.credits}</strong>
            </div>
          ))}
          {estimate?.balance != null ? (
            <div>
              <span>Balance after estimate</span>
              <strong>{estimate.balance - estimate.credits}</strong>
            </div>
          ) : null}
        </div>
      </div>

      {props.submitError ? <div className="cg-submit-error">{props.submitError}</div> : null}

      <button type="button" className="btn btn--accent btn--lg btn--full" disabled={!props.canSubmit} onClick={props.onSubmit}>
        <I.Sparkle size={16} />
        {props.pending
          ? "Generating..."
          : props.promptPreviewLoading
            ? "Building prompt..."
            : props.state.mode === "quick"
              ? "Generate images"
              : "Generate package"}
      </button>
    </aside>
  );
}
