"use client";

import { useEffect, useState } from "react";

import { BrandMoodStep } from "./brand-mood-step";
import { ProductStep } from "./product-step";
import type {
  BrandLite,
  CampaignDetails,
  GenerateState,
  MoodLite,
  OutputFormat,
  OutputSettings,
  ProductLite,
  ProductRole,
  SelectedProduct,
} from "./types";

type MediaType = "social" | "image" | "story" | "portrait" | "custom";

const MEDIA_OPTIONS: Array<{ id: MediaType; icon: string; label: string; sub: string }> = [
  { id: "social", icon: "◎", label: "For social", sub: "Perfect for posts" },
  { id: "image", icon: "▧", label: "Just an image", sub: "General purpose" },
  { id: "story", icon: "▯", label: "Story / Reel", sub: "9:16 vertical" },
  { id: "portrait", icon: "◫", label: "Portrait", sub: "4:5 portrait" },
  { id: "custom", icon: "⌗", label: "Custom size", sub: "Set your size" },
];

const PLATFORMS: Array<{ id: OutputFormat; label: string }> = [
  { id: "instagram_square", label: "Instagram" },
  { id: "facebook_feed", label: "Facebook" },
  { id: "linkedin_feed", label: "LinkedIn" },
  { id: "instagram_story", label: "TikTok" },
  { id: "instagram_portrait", label: "Pinterest" },
  { id: "website_banner", label: "YouTube" },
  { id: "ad_creative", label: "X / Twitter" },
];

const MEDIA_FORMAT: Record<Exclude<MediaType, "social">, OutputFormat> = {
  image: "product_card",
  story: "instagram_story",
  portrait: "instagram_portrait",
  custom: "website_banner",
};

const EMPTY_CAMPAIGN: CampaignDetails = {
  title: "", subtitle: "", message: "", price: "", discount: "",
  badgeText: "", cta: "", offerExpiry: "", legalText: "",
  website: "", phone: "", qrUrl: "", benefitsText: "", targetAudience: "",
};

export function QuickCreate(props: {
  state: GenerateState;
  brands: BrandLite[];
  moods: MoodLite[];
  products: ProductLite[];
  onBriefChange: (brief: string) => void;
  onCampaignChange: (patch: Partial<CampaignDetails>) => void;
  onAddProduct: (product: SelectedProduct) => void;
  onRemoveProduct: (localId: string) => void;
  onProductRoleChange: (localId: string, role: ProductRole) => void;
  onBrandChange: (brandId: string) => void;
  onMoodChange: (moodId: string | null) => void;
  onFlagsChange: (flags: GenerateState["flags"]) => void;
  onOutputsChange: (outputs: OutputSettings) => void;
}) {
  const [mediaType, setMediaType] = useState<MediaType>("social");
  const [platform, setPlatform] = useState<OutputFormat>("instagram_square");
  const [promotionEnabled, setPromotionEnabled] = useState(false);

  // Sync media/platform selection into shared outputs.formats
  useEffect(() => {
    const format: OutputFormat =
      mediaType === "social" ? platform : MEDIA_FORMAT[mediaType];
    props.onOutputsChange({ ...props.state.outputs, formats: [format] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, platform]);

  function handleMediaType(type: MediaType) {
    setMediaType(type);
  }

  function handlePlatform(fmt: OutputFormat) {
    setPlatform(fmt);
  }

  function handlePromotionToggle() {
    const next = !promotionEnabled;
    setPromotionEnabled(next);
    if (!next) props.onCampaignChange(EMPTY_CAMPAIGN);
  }

  const preview = props.state.selectedProducts[0];
  const previewUrl = preview?.previewUrl ?? null;
  const previewInitial = (preview?.commercialFields.name ?? preview?.commercialFields.title ?? "P")
    .slice(0, 1)
    .toUpperCase();

  const { outputs, campaign } = props.state;

  return (
    <div className="qc-stack">
      {/* Section 1 — Choose media */}
      <section className="qc-section">
        <div className="qc-section-head">
          <div>
            <h2 className="qc-step-title">
              <span className="qc-num">1</span>
              Choose media
            </h2>
            <p className="qc-hint">Pick where this image will be used.</p>
          </div>
        </div>

        <div className="qc-media-grid">
          {MEDIA_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`qc-option ${mediaType === opt.id ? "is-active" : ""}`}
              onClick={() => handleMediaType(opt.id)}
            >
              <div className="qc-option-icon">{opt.icon}</div>
              <strong>{opt.label}</strong>
              <span>{opt.sub}</span>
            </button>
          ))}
        </div>

        {mediaType === "social" && (
          <div className="qc-platform-row">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`qc-pill ${platform === p.id ? "is-active" : ""}`}
                onClick={() => handlePlatform(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Section 2 — Product / promotion image */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">2</span>
          Product / promotion image
          <span style={{ color: "var(--fg-3)", fontSize: 14, fontWeight: 600 }}>optional</span>
        </h2>
        <p className="qc-hint">Upload your product, packshot, or promotion item.</p>

        <div className="qc-product-cols">
          <ProductStep
            products={props.products}
            selected={props.state.selectedProducts}
            brandId={props.state.brandId}
            role="hero"
            onAdd={props.onAddProduct}
            onRemove={props.onRemoveProduct}
            onUpdateRole={props.onProductRoleChange}
          />

          <div className="qc-preview-box">
            <small style={{ fontWeight: 800, color: "var(--fg-3)", alignSelf: "flex-start" }}>
              Preview
            </small>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Product preview" />
            ) : preview ? (
              <div className="qc-preview-placeholder">{previewInitial}</div>
            ) : (
              <div className="qc-preview-placeholder">PRODUCT</div>
            )}
          </div>
        </div>

        {/* Promotion toggle */}
        <label className="qc-promotion-row">
          <input
            type="checkbox"
            checked={promotionEnabled}
            onChange={handlePromotionToggle}
          />
          <strong>Enable promotion / campaign</strong>
        </label>

        {promotionEnabled && (
          <div className="qc-promotion-fields">
            <div className="cg-field-row">
              <label>
                <span className="label">Campaign title</span>
                <input
                  aria-label="Campaign title"
                  className="input"
                  value={campaign.title}
                  onChange={(e) => props.onCampaignChange({ title: e.target.value })}
                  placeholder="Glow starts here"
                />
              </label>
              <label>
                <span className="label">Subtitle</span>
                <input
                  className="input"
                  value={campaign.subtitle}
                  onChange={(e) => props.onCampaignChange({ subtitle: e.target.value })}
                  placeholder="Hydration for every morning"
                />
              </label>
            </div>
            <div className="cg-field-row cg-field-row--three">
              <label>
                <span className="label">Price</span>
                <input
                  className="input"
                  value={campaign.price}
                  onChange={(e) => props.onCampaignChange({ price: e.target.value })}
                  placeholder="$29"
                />
              </label>
              <label>
                <span className="label">Discount</span>
                <input
                  className="input"
                  value={campaign.discount}
                  onChange={(e) => props.onCampaignChange({ discount: e.target.value })}
                  placeholder="20% off"
                />
              </label>
              <label>
                <span className="label">CTA</span>
                <input
                  aria-label="CTA"
                  className="input"
                  value={campaign.cta}
                  onChange={(e) => props.onCampaignChange({ cta: e.target.value })}
                  placeholder="Shop now"
                />
              </label>
            </div>
            <label>
              <span className="label">Message</span>
              <textarea
                className="textarea"
                value={campaign.message}
                onChange={(e) => props.onCampaignChange({ message: e.target.value })}
                placeholder="What should the audience understand or feel?"
              />
            </label>
            <div className="cg-field-row">
              <label>
                <span className="label">Benefits</span>
                <input
                  className="input"
                  value={campaign.benefitsText}
                  onChange={(e) => props.onCampaignChange({ benefitsText: e.target.value })}
                  placeholder="Fast hydration, clean ingredients"
                />
              </label>
              <label>
                <span className="label">Target audience</span>
                <input
                  className="input"
                  value={campaign.targetAudience}
                  onChange={(e) => props.onCampaignChange({ targetAudience: e.target.value })}
                  placeholder="Busy professionals, 25-40"
                />
              </label>
            </div>
            <div className="cg-field-row cg-field-row--three">
              <label>
                <span className="label">Offer expiry</span>
                <input
                  className="input"
                  value={campaign.offerExpiry}
                  onChange={(e) => props.onCampaignChange({ offerExpiry: e.target.value })}
                  placeholder="2026-06-30"
                />
              </label>
              <label>
                <span className="label">Website</span>
                <input
                  className="input"
                  value={campaign.website}
                  onChange={(e) => props.onCampaignChange({ website: e.target.value })}
                  placeholder="vyora.example"
                />
              </label>
              <label>
                <span className="label">QR URL</span>
                <input
                  className="input"
                  value={campaign.qrUrl}
                  onChange={(e) => props.onCampaignChange({ qrUrl: e.target.value })}
                  placeholder="https://example.com/offer"
                />
              </label>
            </div>
            <label>
              <span className="label">Legal text</span>
              <input
                className="input"
                value={campaign.legalText}
                onChange={(e) => props.onCampaignChange({ legalText: e.target.value })}
                placeholder="Terms apply. While stocks last."
              />
            </label>
          </div>
        )}
      </section>

      {/* Section 3 — Describe your image */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">3</span>
          Describe your image
        </h2>
        <p className="qc-hint">Tell us what you want to generate.</p>
        <label style={{ display: "block", marginTop: 18 }}>
          <span className="label" style={{ display: "none" }}>Creative brief</span>
          <textarea
            aria-label="Creative brief"
            className="textarea cg-brief"
            value={props.state.brief}
            onChange={(e) => props.onBriefChange(e.target.value)}
            placeholder="Describe what you want to generate...&#10;Example: Christmas sale, cosy living room with a glowing tree, 30% off"
            maxLength={500}
          />
        </label>
        <div style={{ textAlign: "right", color: "var(--fg-3)", fontSize: 12, marginTop: 8 }}>
          {props.state.brief.length} / 500
        </div>
      </section>

      {/* Section 4 — Brand & mood */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">4</span>
          Brand &amp; mood
        </h2>
        <p className="qc-hint" style={{ marginBottom: 18 }}>Apply identity and pick the overall style.</p>
        <BrandMoodStep
          brands={props.brands}
          moods={props.moods}
          brandId={props.state.brandId}
          moodId={props.state.moodId}
          flags={props.state.flags}
          onBrandChange={props.onBrandChange}
          onMoodChange={props.onMoodChange}
          onFlagsChange={props.onFlagsChange}
        />
      </section>

      {/* Section 5 — Generation settings */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">5</span>
          Generation settings
        </h2>

        <div className="qc-gen-grid">
          <div>
            <span className="qc-gen-label">Quality tier</span>
            <div className="qc-quality-grid">
              {(["standard", "premium"] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`qc-gen-option ${outputs.quality === q ? "is-active" : ""}`}
                  onClick={() =>
                    props.onOutputsChange({
                      ...outputs,
                      quality: q,
                    })
                  }
                >
                  <strong>{q === "standard" ? "Standard" : "Premium"}</strong>
                  <span>{q === "standard" ? "10 credits / image" : "20 credits / image"}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="qc-gen-label">Number of samples</span>
            <div className="qc-samples-grid">
              {([1, 2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`qc-gen-option ${outputs.variants === n ? "is-active" : ""}`}
                  onClick={() =>
                    props.onOutputsChange({
                      ...outputs,
                      variants: n,
                    })
                  }
                >
                  <strong>{n}</strong>
                  <span>{n * (outputs.quality === "premium" ? 20 : 10)} credits</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
