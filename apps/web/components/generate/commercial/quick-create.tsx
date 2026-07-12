"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";

import { I } from "@/components/icons";
import { UpgradeInline } from "@/components/billing/upgrade-inline";

import { MoodPickerControl } from "./mood-picker-dialog";
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
  StockAssetLite,
} from "./types";

type PlatformId = "instagram" | "facebook" | "linkedin" | "tiktok";

const PLATFORM_OPTIONS: Array<{ id: PlatformId; label: string; icon: string; color: string }> = [
  { id: "instagram", label: "Instagram", icon: "◎", color: "#E4405F" },
  { id: "facebook", label: "Facebook", icon: "f", color: "#1877F2" },
  { id: "linkedin", label: "LinkedIn", icon: "in", color: "#0A66C2" },
  { id: "tiktok", label: "TikTok", icon: "♪", color: "#0E0E10" },
];

const CONTENT_BY_PLATFORM: Record<
  PlatformId,
  Array<{ id: OutputFormat; label: string; sub: string; icon: string }>
> = {
  instagram: [
    { id: "instagram_square", label: "Post", sub: "Square", icon: "▣" },
    { id: "instagram_portrait", label: "Portrait", sub: "4:5", icon: "▥" },
    { id: "instagram_landscape", label: "Landscape", sub: "Wide", icon: "▭" },
    { id: "instagram_story", label: "Story", sub: "9:16", icon: "▯" },
    { id: "instagram_reel", label: "Reel", sub: "Vertical", icon: "▶" },
    { id: "instagram_feed_video_square", label: "Feed video", sub: "Square", icon: "◉" },
  ],
  facebook: [
    { id: "facebook_square", label: "Square", sub: "Post", icon: "▣" },
    { id: "facebook_portrait", label: "Portrait", sub: "4:5", icon: "▥" },
    { id: "facebook_landscape", label: "Landscape", sub: "Wide", icon: "▭" },
    { id: "facebook_profile_photo", label: "Profile", sub: "Photo", icon: "◌" },
    { id: "facebook_cover_photo", label: "Cover", sub: "Header", icon: "▰" },
    { id: "facebook_story", label: "Story", sub: "9:16", icon: "▯" },
    { id: "facebook_link_preview", label: "Link", sub: "Preview", icon: "↗" },
  ],
  linkedin: [{ id: "linkedin_feed", label: "Post", sub: "Feed", icon: "▭" }],
  tiktok: [{ id: "tiktok_vertical", label: "Vertical", sub: "9:16", icon: "▶" }],
};

const EMPTY_CAMPAIGN: CampaignDetails = {
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
};
const CREATIVE_BRIEF_MAX_LENGTH = 4000;

export function QuickCreate(props: {
  state: GenerateState;
  brands: BrandLite[];
  moods: MoodLite[];
  products: ProductLite[];
  stockAssets: StockAssetLite[];
  planSegment: "free" | "subscription" | "payg";
  onBriefChange: (brief: string) => void;
  onCampaignChange: (patch: Partial<CampaignDetails>) => void;
  onAddProduct: (product: SelectedProduct) => void;
  onRemoveProduct: (localId: string) => void;
  onProductRoleChange: (localId: string, role: ProductRole) => void;
  onBrandChange: (brandId: string) => void;
  onMoodChange: (moodId: string | null) => void;
  onStockAssetChange: (id: string | null) => void;
  onFlagsChange: (flags: GenerateState["flags"]) => void;
  onBrandLogoAssetIdsChange: (ids: string[]) => void;
  onOutputsChange: (outputs: OutputSettings) => void;
}) {
  const [platform, setPlatform] = useState<PlatformId>("instagram");
  const [contentType, setContentType] = useState<OutputFormat>("instagram_square");
  const [promotionEnabled, setPromotionEnabled] = useState(false);

  const outputsRef = useRef(props.state.outputs);
  outputsRef.current = props.state.outputs;

  // Sync platform/content selection into shared outputs.formats.
  useEffect(() => {
    props.onOutputsChange({ ...outputsRef.current, formats: [contentType] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType]);

  function handlePlatform(nextPlatform: PlatformId) {
    setPlatform(nextPlatform);
    setContentType(CONTENT_BY_PLATFORM[nextPlatform][0]!.id);
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
  const premiumDisabled = props.planSegment === "free";

  return (
    <div className="qc-stack">
      <section className="qc-brief-card" aria-label="Creative brief">
        <div>
          <span className="cg-kicker">Creative Studio</span>
          <h2>Compose the next product image</h2>
          <p>
            Start with the creative direction, then choose channel, product, brand, campaign copy,
            mood, and output settings.
          </p>
        </div>
        <label className="qc-brief-field">
          <span className="label">Creative Brief</span>
          <textarea
            name="creative_brief"
            aria-label="Creative brief"
            className="textarea cg-brief qc-brief-textarea"
            value={props.state.brief}
            onChange={(e) => props.onBriefChange(e.target.value)}
            placeholder={"Christmas sale, cozy living room with a glowing tree, 30% off…"}
            maxLength={CREATIVE_BRIEF_MAX_LENGTH}
            autoComplete="off"
          />
        </label>
        <div className="qc-brief-meta" aria-live="polite">
          <span>
            {props.state.brief.length} / {CREATIVE_BRIEF_MAX_LENGTH}
          </span>
          <span>
            {outputs.variants} sample{outputs.variants === 1 ? "" : "s"}
          </span>
          <span>{outputs.quality === "premium" ? "Premium" : "Standard"}</span>
        </div>
      </section>

      {/* Section 1 — Platform and content type */}
      <section className="qc-section">
        <div className="qc-step-block">
          <h2 className="qc-step-title">
            <span className="qc-num">1</span>
            Choose Channel
          </h2>

          <div className="qc-platform-row">
            {PLATFORM_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`qc-platform-tile ${platform === option.id ? "is-active" : ""}`}
                onClick={() => handlePlatform(option.id)}
              >
                <span
                  className={`qc-platform-logo qc-platform-logo--${option.id}`}
                  style={{ background: option.color }}
                >
                  {option.icon}
                </span>
                <strong>{option.label}</strong>
                {platform === option.id ? <i aria-hidden="true">✓</i> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="qc-section-rule" />

        <div className="qc-step-block">
          <h2 className="qc-step-title">
            <span className="qc-num">2</span>
            Choose Format
          </h2>

          <div className="qc-content-row">
            {CONTENT_BY_PLATFORM[platform].map((option) => (
              <button
                key={option.id}
                type="button"
                className={`qc-content-tile ${contentType === option.id ? "is-active" : ""}`}
                onClick={() => setContentType(option.id)}
              >
                <span>{option.icon}</span>
                <strong>{option.label}</strong>
                <small>{option.sub}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Campaign details */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">3</span>
          Campaign Details
          <span style={{ color: "var(--fg-3)", fontSize: 14, fontWeight: 600 }}>optional</span>
        </h2>
        <p className="qc-hint">
          Add promotion copy, offer details, and calls to action when this image is for a campaign.
        </p>

        <label className="qc-promotion-row qc-promotion-row--top">
          <input type="checkbox" checked={promotionEnabled} onChange={handlePromotionToggle} />
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
                  name="campaign_title"
                  autoComplete="off"
                  value={campaign.title}
                  onChange={(e) => props.onCampaignChange({ title: e.target.value })}
                  placeholder="Glow starts here…"
                />
              </label>
              <label>
                <span className="label">Subtitle</span>
                <input
                  className="input"
                  name="campaign_subtitle"
                  autoComplete="off"
                  value={campaign.subtitle}
                  onChange={(e) => props.onCampaignChange({ subtitle: e.target.value })}
                  placeholder="Hydration for every morning…"
                />
              </label>
            </div>
            <div className="cg-field-row cg-field-row--three">
              <label>
                <span className="label">Price</span>
                <input
                  className="input"
                  name="campaign_price"
                  inputMode="decimal"
                  autoComplete="off"
                  value={campaign.price}
                  onChange={(e) => props.onCampaignChange({ price: e.target.value })}
                  placeholder="$29…"
                />
              </label>
              <label>
                <span className="label">Discount</span>
                <input
                  className="input"
                  name="campaign_discount"
                  autoComplete="off"
                  value={campaign.discount}
                  onChange={(e) => props.onCampaignChange({ discount: e.target.value })}
                  placeholder="20% off…"
                />
              </label>
              <label>
                <span className="label">CTA</span>
                <input
                  aria-label="CTA"
                  className="input"
                  name="campaign_cta"
                  autoComplete="off"
                  value={campaign.cta}
                  onChange={(e) => props.onCampaignChange({ cta: e.target.value })}
                  placeholder="Shop now…"
                />
              </label>
            </div>
            <label>
              <span className="label">Message</span>
              <textarea
                className="textarea"
                name="campaign_message"
                autoComplete="off"
                value={campaign.message}
                onChange={(e) => props.onCampaignChange({ message: e.target.value })}
                placeholder="What should the audience understand or feel?…"
              />
            </label>
            <div className="cg-field-row">
              <label>
                <span className="label">Benefits</span>
                <input
                  className="input"
                  name="campaign_benefits"
                  autoComplete="off"
                  value={campaign.benefitsText}
                  onChange={(e) => props.onCampaignChange({ benefitsText: e.target.value })}
                  placeholder="Fast hydration, clean ingredients…"
                />
              </label>
              <label>
                <span className="label">Target audience</span>
                <input
                  className="input"
                  name="campaign_target_audience"
                  autoComplete="off"
                  value={campaign.targetAudience}
                  onChange={(e) => props.onCampaignChange({ targetAudience: e.target.value })}
                  placeholder="Busy professionals, 25–40…"
                />
              </label>
            </div>
            <div className="cg-field-row cg-field-row--three">
              <label>
                <span className="label">Offer expiry</span>
                <input
                  className="input"
                  name="campaign_offer_expiry"
                  type="date"
                  autoComplete="off"
                  value={campaign.offerExpiry}
                  onChange={(e) => props.onCampaignChange({ offerExpiry: e.target.value })}
                />
              </label>
              <label>
                <span className="label">Website</span>
                <input
                  className="input"
                  name="campaign_website"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  value={campaign.website}
                  onChange={(e) => props.onCampaignChange({ website: e.target.value })}
                  placeholder="https://layertone.example…"
                />
              </label>
              <label>
                <span className="label">QR URL</span>
                <input
                  className="input"
                  name="campaign_qr_url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  value={campaign.qrUrl}
                  onChange={(e) => props.onCampaignChange({ qrUrl: e.target.value })}
                  placeholder="https://example.com/offer…"
                />
              </label>
            </div>
            <label>
              <span className="label">Legal text</span>
              <input
                className="input"
                name="campaign_legal_text"
                autoComplete="off"
                value={campaign.legalText}
                onChange={(e) => props.onCampaignChange({ legalText: e.target.value })}
                placeholder="Terms apply. While stocks last…"
              />
            </label>
          </div>
        )}
      </section>

      {/* Section 4 — Product / promotion image */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">4</span>
          Product Image
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

      {/* Section 5 — Brand */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">5</span>
          Brand
        </h2>
        <p className="qc-hint" style={{ marginBottom: 18 }}>
          Select a brand and choose which identity assets to apply.
        </p>
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
        <p className="qc-hint" style={{ marginBottom: 18 }}>
          Pick the visual direction and review related references.
        </p>
        <QuickMoodSection
          moods={props.moods}
          moodId={props.state.moodId}
          onMoodChange={props.onMoodChange}
          disabled={props.planSegment === "free"}
        />
      </section>

      {/* Stock certification mark picker */}
      {props.stockAssets.length > 0 ? (
        <details className="qc-stock-picker">
          <summary className="qc-stock-picker__summary">
            <I.Tag size={14} />
            <span>
              {props.state.stockAssetId
                ? `Certification mark · ${props.stockAssets.find((a) => a.id === props.state.stockAssetId)?.label ?? "Selected"}`
                : "Add certification mark"}
            </span>
            {props.state.stockAssetId ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ marginLeft: "auto", fontSize: 12 }}
                onClick={(e) => {
                  e.preventDefault();
                  props.onStockAssetChange(null);
                }}
              >
                Clear
              </button>
            ) : null}
          </summary>
          <StockPicker
            assets={props.stockAssets}
            selectedId={props.state.stockAssetId}
            onChange={props.onStockAssetChange}
          />
        </details>
      ) : null}

      {/* Section 7 — Generation settings */}
      <section className="qc-section">
        <h2 className="qc-step-title">
          <span className="qc-num">7</span>
          Generation Settings
        </h2>

        <div className="qc-gen-grid">
          <div>
            <span className="qc-gen-label">Quality tier</span>
            <div className="qc-quality-grid">
              {(["standard", "premium"] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={q === "premium" && premiumDisabled}
                  className={`qc-gen-option ${outputs.quality === q ? "is-active" : ""}`}
                  onClick={() =>
                    props.onOutputsChange({
                      ...outputs,
                      quality: q,
                    })
                  }
                >
                  <strong>{q === "standard" ? "Standard" : "Premium"}</strong>
                  <span>
                    {q === "premium" && premiumDisabled
                      ? "Premium locked"
                      : q === "standard"
                        ? "5+ credits / image"
                        : "15+ credits / image"}
                  </span>
                </button>
              ))}
            </div>
            {premiumDisabled ? (
              <div style={{ marginTop: 8 }}>
                <UpgradeInline
                  feature="premium-quality"
                  label="Premium quality requires credits."
                />
              </div>
            ) : null}
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
                  <span>{n * (outputs.quality === "premium" ? 15 : 5)}+ credits</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type StockPickerCategory =
  | "all"
  | "food-dietary"
  | "food-safety"
  | "cosmetics"
  | "manufacturing"
  | "wellness";

const PICKER_CATEGORIES: Array<{ key: StockPickerCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "food-dietary", label: "Dietary" },
  { key: "food-safety", label: "Safety" },
  { key: "cosmetics", label: "Cosmetics" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "wellness", label: "Wellness" },
];

function StockPicker({
  assets,
  selectedId,
  onChange,
}: {
  assets: StockAssetLite[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [category, setCategory] = useState<StockPickerCategory>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assets.filter((a) => {
      const matchesCat = category === "all" || a.category === category;
      const matchesSearch =
        !q || a.label.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [assets, category, search]);

  return (
    <div className="qc-stock-picker__body">
      <div className="qc-stock-picker__controls">
        <input
          className="input"
          style={{ fontSize: 13 }}
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        <div className="tabs" style={{ flexWrap: "wrap", gap: 4 }}>
          {PICKER_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`tab${category === c.key ? " is-active" : ""}`}
              style={{ fontSize: 12, padding: "4px 10px" }}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="qc-stock-picker__grid">
        {filtered.map((asset) => {
          const isSelected = asset.id === selectedId;
          return (
            <button
              key={asset.id}
              type="button"
              className={`qc-stock-tile${isSelected ? " is-selected" : ""}`}
              onClick={() => onChange(isSelected ? null : asset.id)}
              aria-pressed={isSelected}
              title={asset.label}
            >
              <div className="qc-stock-tile__img">
                {asset.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <I.Image size={20} style={{ color: "var(--fg-3)" }} />
                )}
                {isSelected ? (
                  <div className="qc-stock-tile__check">
                    <I.Check size={12} />
                  </div>
                ) : null}
              </div>
              <span className="qc-stock-tile__label">{asset.label}</span>
            </button>
          );
        })}
      </div>
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
  const colors = (activeBrand?.palette ?? []).filter(Boolean).slice(0, 6);
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
        <select
          className="select"
          value={props.brandId}
          onChange={(event) => props.onBrandChange(event.target.value)}
        >
          <option value="">Select a brand</option>
          {props.brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>
      {props.brands.length === 0 ? (
        <p className="qc-empty-note">
          No saved brands yet. <a href="/brands/new/identify?new=1">Create a brand</a> to use brand
          colors, logos, and fonts.
        </p>
      ) : null}

      <div className="qc-brand-control-grid">
        <BrandAssetToggle
          label="Use brand colors"
          checked={hasBrand && props.flags.useBrandColors}
          disabled={!hasBrand}
          onChange={() =>
            props.onFlagsChange({ ...props.flags, useBrandColors: !props.flags.useBrandColors })
          }
        >
          <div className="qc-color-strips">
            {colors.length > 0 ? (
              colors.map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  title={`${brandColorLabel(index)}: ${color}`}
                  style={{ background: color }}
                />
              ))
            ) : (
              <small>No saved colors</small>
            )}
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
          onChange={() =>
            props.onFlagsChange({ ...props.flags, useBrandFonts: !props.flags.useBrandFonts })
          }
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
                      {asset.width && asset.height
                        ? `${asset.width} × ${asset.height}`
                        : "Logo asset"}
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

function brandColorLabel(index: number): string {
  return (
    ["Primary", "Secondary", "Accent", "Extra 1", "Extra 2", "Extra 3"][index] ??
    `Color ${index + 1}`
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
      <button
        type="button"
        className="qc-brand-toggle-head"
        onClick={props.onChange}
        disabled={props.disabled}
      >
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
  disabled?: boolean;
}) {
  const selectedMood = props.moods.find((mood) => mood.id === props.moodId) ?? null;
  const previewImages = getMoodPreviewImages(selectedMood);

  return (
    <div className="qc-mood-stack">
      {props.disabled ? (
        <div className="qc-empty-note">
          <UpgradeInline feature="moods" label="Moods are not available on the Free plan." />
        </div>
      ) : null}
      <MoodPickerControl
        moods={props.moods}
        moodId={props.moodId}
        disabled={props.disabled}
        onMoodChange={props.onMoodChange}
      />

      {previewImages.length > 0 ? (
        <div className="qc-mood-preview">
          <div>
            <span className="label">
              {selectedMood ? `${selectedMood.name} references` : "Mood references"}
            </span>
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
