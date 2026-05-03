# Quick Create Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Quick Create tab to match the `vyora_image_generation_page.html` visual style — numbered section cards, option cards with hover lift, platform pills — while keeping all current multi-product functionality and adding a collapsible promotion toggle.

**Architecture:** Full rewrite of `quick-create.tsx` only; `generate-shell.tsx`, all step sub-components, the reducer, and the ReviewRail sidebar are untouched. Local state for `mediaType`, `platform`, and `promotionEnabled` lives in `quick-create.tsx` and syncs into the shared reducer via existing callbacks. New `qc-*` CSS classes are appended to `cal-studio.css`.

**Tech Stack:** React 18, TypeScript, CSS custom properties (Cal design system tokens), `@testing-library/react` + Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/web/app/cal-studio.css` | Modify — append ~80 lines | All `qc-*` layout/visual classes |
| `apps/web/components/generate/commercial/quick-create.tsx` | Full rewrite | 5-section numbered Quick Create UI |
| `apps/web/tests/generate-commercial.test.tsx` | Modify — update + add tests | Keep existing tests green, add media/promotion tests |

---

## Task 1: Add qc-* CSS classes to cal-studio.css

**Files:**
- Modify: `apps/web/app/cal-studio.css` (append after the last `@media` block, around line 789)

- [ ] **Step 1: Append the qc-* block to cal-studio.css**

Open `apps/web/app/cal-studio.css` and append the following after the closing `}` of the last `@media` block (currently around line 788):

```css
/* ---------- Quick Create — numbered sections ---------- */
.qc-stack {
  display: grid;
  gap: 18px;
}

.qc-section {
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(230,232,240,0.92);
  border-radius: 24px;
  box-shadow: 0 18px 45px rgba(31,41,55,0.08);
  padding: 26px;
  backdrop-filter: blur(16px);
}

.qc-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.qc-step-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.qc-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #111827;
  color: white;
  display: inline-grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.qc-hint {
  color: var(--fg-3);
  margin: 8px 0 0 40px;
  font-size: 14px;
}

/* Section 1 — media cards */
.qc-media-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.qc-option {
  border: 1px solid var(--cal-gray-200);
  background: var(--cal-white);
  border-radius: 16px;
  padding: 16px;
  min-height: 78px;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease,
              box-shadow 0.18s ease, transform 0.18s ease;
  text-align: left;
}

.qc-option:hover {
  border-color: var(--studio-violet);
  background: linear-gradient(180deg, #ffffff, #f7f6ff);
  box-shadow: 0 14px 28px rgba(99,91,255,0.12);
  transform: translateY(-1px);
}

.qc-option.is-active {
  border-color: var(--studio-violet);
  background: linear-gradient(180deg, #ffffff, #f7f6ff);
  box-shadow: 0 0 0 3px var(--studio-violet-100), 0 14px 28px rgba(99,91,255,0.12);
}

.qc-option-icon { font-size: 20px; }
.qc-option strong {
  display: block;
  font-size: 14px;
  margin-top: 8px;
  font-weight: 700;
}
.qc-option span {
  display: block;
  color: var(--fg-3);
  font-size: 12px;
  margin-top: 4px;
}

/* Platform pills */
.qc-platform-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.qc-pill {
  border: 1px solid var(--cal-gray-200);
  background: var(--cal-white);
  border-radius: 999px;
  padding: 9px 14px;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.qc-pill.is-active {
  background: var(--studio-violet-50);
  border-color: var(--studio-violet);
  color: var(--studio-violet-700);
  box-shadow: 0 6px 16px rgba(94,92,230,0.14);
}

/* Section 2 — product two-col */
.qc-product-cols {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr;
  gap: 14px;
  margin-top: 18px;
}

.qc-preview-box {
  border-radius: 18px;
  background: #f6f7fb;
  border: 1px solid var(--cal-gray-200);
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 170px;
  gap: 10px;
}

.qc-preview-box img {
  max-height: 130px;
  width: 100%;
  object-fit: contain;
  border-radius: 10px;
}

.qc-preview-placeholder {
  height: 130px;
  width: 100%;
  border-radius: 14px;
  background: linear-gradient(90deg, #ded6ca 0%, #f6efe8 55%, #d8c8b7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b6f56;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.05em;
}

/* Promotion toggle */
.qc-promotion-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--cal-gray-200);
  cursor: pointer;
}

.qc-promotion-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--studio-violet);
}

.qc-promotion-row strong {
  font-size: 15px;
  font-weight: 700;
}

.qc-promotion-fields {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

/* Section 5 — generation settings */
.qc-gen-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 18px;
}

.qc-gen-label {
  display: block;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 12px;
}

.qc-samples-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.qc-quality-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.qc-gen-option {
  border: 1px solid var(--cal-gray-200);
  background: var(--cal-white);
  border-radius: 16px;
  padding: 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s ease, background 0.18s ease,
              box-shadow 0.18s ease, transform 0.18s ease;
}

.qc-gen-option:hover {
  border-color: var(--studio-violet);
  background: linear-gradient(180deg, #ffffff, #f7f6ff);
  box-shadow: 0 10px 20px rgba(99,91,255,0.1);
  transform: translateY(-1px);
}

.qc-gen-option.is-active {
  border-color: var(--studio-violet);
  background: linear-gradient(180deg, #ffffff, #f7f6ff);
  box-shadow: 0 0 0 3px var(--studio-violet-100);
}

.qc-gen-option strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
}

.qc-gen-option span {
  display: block;
  color: var(--fg-3);
  font-size: 12px;
  margin-top: 4px;
}

/* Responsive */
@media (max-width: 900px) {
  .qc-media-grid { grid-template-columns: repeat(2, 1fr); }
  .qc-product-cols { grid-template-columns: 1fr; }
  .qc-gen-grid { grid-template-columns: 1fr; }
  .qc-samples-grid { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 2: Verify no TypeScript errors introduced by CSS change**

```bash
pnpm --filter @vyora/web typecheck
```

Expected: exit 0 (CSS changes cannot break TS, this is just a sanity check)

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/cal-studio.css
git commit -m "style(web): add qc-* classes for Quick Create redesign"
```

---

## Task 2: Rewrite quick-create.tsx

**Files:**
- Modify: `apps/web/components/generate/commercial/quick-create.tsx` (full rewrite)

The component accepts the same props as before — no changes to the caller (`generate-shell.tsx`).

- [ ] **Step 1: Replace the file contents**

```tsx
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
          <span className="sr-only">Creative brief</span>
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
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @vyora/web typecheck
```

Expected: exit 0 with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/generate/commercial/quick-create.tsx
git commit -m "feat(web): rewrite Quick Create as numbered HTML-style sections"
```

---

## Task 3: Update tests

The existing test suite calls `screen.getByLabelText(/creative brief/i)` and `screen.getByLabelText(/cta/i)`. The CTA field is now hidden behind the promotion toggle. Update those tests and add two new ones.

**Files:**
- Modify: `apps/web/tests/generate-commercial.test.tsx`

- [ ] **Step 1: Update the existing submit test to enable promotion before filling CTA**

In the test `"submits the normalized commercial payload"`, the CTA field is now inside the promotion-enabled block. Add a click on the promotion checkbox before filling the CTA. Replace that test's body:

```tsx
it("submits the normalized commercial payload", async () => {
  const fetchMock = vi.mocked(fetch);
  render(React.createElement(Generate, props));

  fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
  fireEvent.change(screen.getByLabelText(/creative brief/i), {
    target: { value: "Create a clean launch image" },
  });

  // enable promotion to expose CTA field
  fireEvent.click(screen.getByLabelText(/enable promotion/i));
  fireEvent.change(screen.getByLabelText(/cta/i), {
    target: { value: "Shop now" },
  });

  const generate = await screen.findByRole("button", { name: /generate images/i });
  await waitFor(() => expect(generate).toBeEnabled());
  fireEvent.click(generate);

  await waitFor(() => expect(push).toHaveBeenCalledWith("/generations/44444444-4444-4444-8444-444444444444"));
  const createCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/api/generations"));
  expect(createCall).toBeTruthy();
  const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<string, unknown>;
  expect(body).toMatchObject({
    mode: "quick",
    creationType: "single_product",
    brandId,
    brief: "Create a clean launch image",
    campaign: { cta: "Shop now" },
    outputs: { variants: 2, quality: "standard", formats: ["instagram_square"] },
  });
  expect(body.productRefs).toEqual([
    expect.objectContaining({ productId, role: "hero" }),
  ]);
});
```

- [ ] **Step 2: Add test — media type changes format**

Add this test inside the `describe` block:

```tsx
it("selecting Story/Reel sets instagram_story format in the payload", async () => {
  const fetchMock = vi.mocked(fetch);
  render(React.createElement(Generate, props));

  fireEvent.click(screen.getByRole("button", { name: /story \/ reel/i }));
  fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
  fireEvent.change(screen.getByLabelText(/creative brief/i), {
    target: { value: "Vertical reel for spring launch" },
  });

  const generate = await screen.findByRole("button", { name: /generate images/i });
  await waitFor(() => expect(generate).toBeEnabled());
  fireEvent.click(generate);

  await waitFor(() => expect(push).toHaveBeenCalled());
  const createCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/api/generations"));
  const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<string, unknown>;
  expect(body).toMatchObject({
    outputs: expect.objectContaining({ formats: ["instagram_story"] }),
  });
});
```

- [ ] **Step 3: Add test — promotion toggle clears campaign fields on uncheck**

```tsx
it("unchecking promotion toggle clears campaign fields from payload", async () => {
  const fetchMock = vi.mocked(fetch);
  render(React.createElement(Generate, props));

  fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
  fireEvent.change(screen.getByLabelText(/creative brief/i), {
    target: { value: "Launch image" },
  });

  // enable promotion, fill title
  fireEvent.click(screen.getByLabelText(/enable promotion/i));
  fireEvent.change(screen.getByLabelText(/campaign title/i), {
    target: { value: "Summer sale" },
  });

  // uncheck — should clear
  fireEvent.click(screen.getByLabelText(/enable promotion/i));
  expect(screen.queryByLabelText(/campaign title/i)).not.toBeInTheDocument();

  const generate = await screen.findByRole("button", { name: /generate images/i });
  await waitFor(() => expect(generate).toBeEnabled());
  fireEvent.click(generate);

  await waitFor(() => expect(push).toHaveBeenCalled());
  const createCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/api/generations"));
  const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<string, unknown>;
  const campaign = body.campaign as Record<string, unknown>;
  expect(campaign.title).toBeFalsy();
});
```

- [ ] **Step 4: Run the full test suite**

```bash
pnpm --filter @vyora/web test
```

Expected: all tests pass. If the `"renders server preflight warnings"` test fails because it tries to access `getByLabelText(/creative brief/i)` before selecting a product, check that the brief textarea is still accessible — the `aria-label="Creative brief"` attribute is present in the new JSX.

- [ ] **Step 5: Commit**

```bash
git add apps/web/tests/generate-commercial.test.tsx
git commit -m "test(web): update Quick Create tests for media type and promotion toggle"
```

---

## Task 4: Final verification

- [ ] **Step 1: Full typecheck**

```bash
pnpm --filter @vyora/web typecheck
```

Expected: exit 0

- [ ] **Step 2: Full test run**

```bash
pnpm --filter @vyora/web test
```

Expected: all tests pass

- [ ] **Step 3: Start dev server and visually verify Quick Create**

```bash
pnpm --filter @vyora/web dev
```

Open the generate page and check:
- Numbered sections render with dark circle step numbers
- Section 1 shows 5 media cards; selecting "For social" shows platform pills; selecting another card hides the pills
- Section 2 shows ProductStep on the left; right column shows "PRODUCT" placeholder until a product is added
- Promotion checkbox is visible; checking it reveals all campaign fields; unchecking hides them
- Section 3 shows brief textarea with char counter
- Section 4 shows BrandMoodStep (brand select, palette, moods, toggles)
- Section 5 shows quality (Standard/Premium) and samples (1/2/3/4) cards
- ReviewRail sidebar is unchanged and still shows estimate + generate button

- [ ] **Step 4: Commit if any visual fixes were made, otherwise done**

```bash
git add -p
git commit -m "fix(web): Quick Create visual polish after dev review"
```
