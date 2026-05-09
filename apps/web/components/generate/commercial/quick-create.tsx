"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";

import { ProductStep } from "./product-step";
import type {
  BrandFlags,
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

const MEDIA_OPTIONS: Array<{ id: MediaType; icon: string; label: string; sub: string; color: string }> = [
  { id: "social", icon: "◎", label: "For social", sub: "Perfect for posts", color: "#E4405F" },
  { id: "image", icon: "▧", label: "Just an image", sub: "General purpose", color: "#1F7A5A" },
  { id: "story", icon: "▯", label: "Story / Reel", sub: "9:16 vertical", color: "#0E0E10" },
  { id: "portrait", icon: "◫", label: "Portrait", sub: "4:5 portrait", color: "#B5651D" },
  { id: "custom", icon: "⌗", label: "Custom size", sub: "Set your size", color: "#5E5CE6" },
];

const SOCIAL_FORMATS: Array<{ id: OutputFormat; label: string; icon: string; color: string; sub: string }> = [
  { id: "instagram_square", label: "Instagram - Square", icon: "IG", color: "#E4405F", sub: "Post image: 1080 × 1080" },
  { id: "instagram_portrait", label: "Instagram - Portrait", icon: "IG", color: "#E4405F", sub: "Post image: 1080 × 1350" },
  { id: "instagram_landscape", label: "Instagram - Landscape", icon: "IG", color: "#E4405F", sub: "Post image: 1080 × 566" },
  { id: "instagram_story", label: "Instagram - Story", icon: "IG", color: "#E4405F", sub: "Story: 1080 × 1920 (9:16)" },
  { id: "instagram_reel", label: "Instagram - Reel", icon: "IG", color: "#E4405F", sub: "Reel: 1080 × 1920 (9:16)" },
  { id: "instagram_feed_video_portrait", label: "Instagram - Feed video", icon: "IG", color: "#E4405F", sub: "Portrait: 1080 × 1350" },
  { id: "instagram_feed_video_square", label: "Instagram - Feed video", icon: "IG", color: "#E4405F", sub: "Square: 1080 × 1080" },
  { id: "facebook_square", label: "Facebook - Square", icon: "f", color: "#1877F2", sub: "Post image: 1080 × 1080" },
  { id: "facebook_portrait", label: "Facebook - Portrait", icon: "f", color: "#1877F2", sub: "Post image: 1080 × 1350" },
  { id: "facebook_landscape", label: "Facebook - Landscape", icon: "f", color: "#1877F2", sub: "Post image: 1080 × 566" },
  { id: "facebook_link_preview", label: "Facebook - Link preview", icon: "f", color: "#1877F2", sub: "Link image: 1200 × 630" },
  { id: "facebook_profile_photo", label: "Facebook - Profile", icon: "f", color: "#1877F2", sub: "Profile photo: 320 × 320" },
  { id: "facebook_cover_photo", label: "Facebook - Cover", icon: "f", color: "#1877F2", sub: "Cover photo: 820 × 360" },
  { id: "facebook_story", label: "Facebook - Story", icon: "f", color: "#1877F2", sub: "Story: 1080 × 1920" },
  { id: "linkedin_feed", label: "LinkedIn - Standard post", icon: "in", color: "#0A66C2", sub: "1200 × 627" },
  { id: "tiktok_vertical", label: "TikTok - Vertical", icon: "TT", color: "#0E0E10", sub: "Video/image: 1080 × 1920 (9:16)" },
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
  onBrandLogoAssetIdsChange: (ids: string[]) => void;
  onOutputsChange: (outputs: OutputSettings) => void;
}) {
  const [mediaType, setMediaType] = useState<MediaType>("social");
  const [platform, setPlatform] = useState<OutputFormat>("instagram_square");
  const [promotionEnabled, setPromotionEnabled] = useState(false);

  const outputsRef = useRef(props.state.outputs);
  outputsRef.current = props.state.outputs;

  // Sync media/platform selection into shared outputs.formats
  useEffect(() => {
    const format: OutputFormat =
      mediaType === "social" ? platform : MEDIA_FORMAT[mediaType];
    props.onOutputsChange({ ...outputsRef.current, formats: [format] });
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
              <div className="qc-option-icon" style={{ background: opt.color }}>{opt.icon}</div>
              <strong>{opt.label}</strong>
              <span>{opt.sub}</span>
            </button>
          ))}
        </div>

        {mediaType === "social" && (
          <div className="qc-platform-grid">
            {SOCIAL_FORMATS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`qc-platform-card ${platform === p.id ? "is-active" : ""}`}
                onClick={() => handlePlatform(p.id)}
              >
                <span className="qc-platform-icon" style={{ background: p.color }}>{p.icon}</span>
                <span>
                  <strong>{p.label}</strong>
                  <small>{p.sub}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Section 2 — Campaign details */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">2</span>
          Campaign details
          <span style={{ color: "var(--fg-3)", fontSize: 14, fontWeight: 600 }}>optional</span>
        </h2>
        <p className="qc-hint">Add promotion copy, offer details, and calls to action when this image is for a campaign.</p>

        <label className="qc-promotion-row qc-promotion-row--top">
          <input
            type="checkbox"
            checked={promotionEnabled}
            onChange={handlePromotionToggle}
          />
          <span>
            <strong>Enable promotion / campaign</strong>
            <small>Add offer text, price, call to action, audience, and campaign details.</small>
          </span>
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

      {/* Section 3 — Product / promotion image */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">3</span>
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
      </section>

      {/* Section 4 — Describe your image */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">4</span>
          Describe your image
        </h2>
        <p className="qc-hint">Tell us what you want to generate.</p>
        <label style={{ display: "block", marginTop: 18 }}>
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

      {/* Section 5 — Brand */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">5</span>
          Brand
        </h2>
        <p className="qc-hint" style={{ marginBottom: 18 }}>Select a brand and choose which identity assets to apply.</p>
        <QuickBrandSection
          brands={props.brands}
          brandId={props.state.brandId}
          flags={props.state.flags}
          selectedLogoAssetIds={props.state.brandLogoAssetIds}
          onBrandChange={props.onBrandChange}
          onFlagsChange={props.onFlagsChange}
          onLogoAssetIdsChange={props.onBrandLogoAssetIdsChange}
        />
      </section>

      {/* Section 6 — Mood */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">6</span>
          Mood
        </h2>
        <p className="qc-hint" style={{ marginBottom: 18 }}>Pick the visual direction and review related references.</p>
        <QuickMoodSection
          moods={props.moods}
          moodId={props.state.moodId}
          onMoodChange={props.onMoodChange}
        />
      </section>

      {/* Section 7 — Generation settings */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">7</span>
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

function QuickBrandSection(props: {
  brands: BrandLite[];
  brandId: string;
  flags: BrandFlags;
  selectedLogoAssetIds: string[];
  onBrandChange: (brandId: string) => void;
  onFlagsChange: (flags: BrandFlags) => void;
  onLogoAssetIdsChange: (ids: string[]) => void;
}) {
  const activeBrand = props.brands.find((brand) => brand.id === props.brandId);
  const hasBrand = Boolean(activeBrand);
  const logoAssets = activeBrand?.logoAssets ?? [];
  const colors = (activeBrand?.palette ?? []).slice(0, 4);
  const initials = (activeBrand?.name ?? "Brand").slice(0, 2).toUpperCase();
  const selectedLogoIds = props.selectedLogoAssetIds.filter((id) =>
    logoAssets.some((asset) => asset.id === id),
  );

  function toggleBrandLogo() {
    const next = !props.flags.useBrandLogo;
    props.onFlagsChange({ ...props.flags, useBrandLogo: next });
    if (!next) props.onLogoAssetIdsChange([]);
  }

  function toggleLogoAsset(assetId: string) {
    const selected = selectedLogoIds.includes(assetId);
    props.onLogoAssetIdsChange(
      selected ? selectedLogoIds.filter((id) => id !== assetId) : [...selectedLogoIds, assetId],
    );
  }

  return (
    <div className="qc-brand-stack">
      <label>
        <span className="label">Select brand</span>
        <select className="select" value={props.brandId} onChange={(event) => props.onBrandChange(event.target.value)}>
          <option value="">Select a brand</option>
          {props.brands.map((brand) => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
      </label>

      <div className="qc-brand-control-grid">
        <BrandAssetToggle
          label="Use brand colors"
          checked={hasBrand && props.flags.useBrandColors}
          disabled={!hasBrand}
          onChange={() => props.onFlagsChange({ ...props.flags, useBrandColors: !props.flags.useBrandColors })}
        >
          <div className="qc-color-strips">
            {colors.map((color, index) => (
              <span key={`${color}-${index}`} style={{ background: color }} />
            ))}
          </div>
        </BrandAssetToggle>

        <BrandAssetToggle
          label="Use brand logo"
          checked={hasBrand && props.flags.useBrandLogo}
          disabled={!hasBrand}
          onChange={toggleBrandLogo}
        >
          <div className="qc-logo-preview">
            <span>{initials}</span>
            <strong>{activeBrand?.name ?? "Selected brand"}</strong>
          </div>
        </BrandAssetToggle>

        <BrandAssetToggle
          label="Use brand fonts"
          checked={hasBrand && props.flags.useBrandFonts}
          disabled={!hasBrand}
          onChange={() => props.onFlagsChange({ ...props.flags, useBrandFonts: !props.flags.useBrandFonts })}
        >
          <div className="qc-font-preview">
            <strong>Campaign Headline</strong>
            <span>Body copy and CTA preview</span>
          </div>
        </BrandAssetToggle>
      </div>

      {hasBrand && props.flags.useBrandLogo ? (
        <div className="qc-logo-picker">
          <span className="label">Select logos to use</span>
          {logoAssets.length > 0 ? (
            <div className="qc-logo-grid">
              {logoAssets.map((asset, index) => {
                const selected = selectedLogoIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Select logo ${index + 1}`}
                    className={`qc-logo-card ${selected ? "is-selected" : ""}`}
                    onClick={() => toggleLogoAsset(asset.id)}
                  >
                    <span className="qc-logo-check">{selected ? "Selected" : "Select"}</span>
                    <span className="qc-logo-thumb">
                      {asset.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.url} alt="" />
                      ) : (
                        initials
                      )}
                    </span>
                    <small>
                      {asset.width && asset.height ? `${asset.width} × ${asset.height}` : "Logo asset"}
                    </small>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="qc-empty-note">No logos are saved for this brand yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BrandAssetToggle(props: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`qc-brand-toggle ${props.disabled ? "is-disabled" : ""}`}>
      <button type="button" className="qc-brand-toggle-head" onClick={props.onChange} disabled={props.disabled}>
        <span>{props.label}</span>
        <span className={`switch ${props.checked ? "is-on" : ""}`} />
      </button>
      <div className={props.checked && !props.disabled ? "" : "is-muted"}>{props.children}</div>
    </div>
  );
}

function QuickMoodSection(props: {
  moods: MoodLite[];
  moodId: string | null;
  onMoodChange: (moodId: string | null) => void;
}) {
  const selectedMood = props.moods.find((mood) => mood.id === props.moodId) ?? null;
  const previewImages = getMoodPreviewImages(selectedMood);

  return (
    <div className="qc-mood-stack">
      <div className="qc-mood-choice-grid">
        <button
          type="button"
          className={`cg-mood-card ${props.moodId === null ? "is-selected" : ""}`}
          onClick={() => props.onMoodChange(null)}
        >
          <span className="cg-mood-swatch" />
          <strong>Just my brand</strong>
          <small>Default</small>
        </button>
        {props.moods.slice(0, 7).map((mood) => (
          <button
            type="button"
            key={mood.id}
            className={`cg-mood-card ${props.moodId === mood.id ? "is-selected" : ""}`}
            onClick={() => props.onMoodChange(mood.id)}
          >
            {mood.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mood.img} alt="" />
            ) : (
              <span className="cg-mood-swatch" style={{ background: mood.colors?.[0] ?? "#E4E3FC" }} />
            )}
            <strong>{mood.name}</strong>
            <small>{mood.kind}</small>
          </button>
        ))}
      </div>

      {previewImages.length > 0 ? (
        <div className="qc-mood-preview">
          <div>
            <span className="label">{selectedMood ? `${selectedMood.name} references` : "Mood references"}</span>
            <div className="qc-mood-preview-grid">
              {previewImages.map((src, index) => (
                <figure key={`${src}-${index}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </figure>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getMoodPreviewImages(mood: MoodLite | null) {
  return mood?.img ? [mood.img] : [];
}
