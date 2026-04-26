import React from "react";

const aspectRatios = [
  { id: "1:1", label: "Square" },
  { id: "4:5", label: "Portrait" },
  { id: "9:16", label: "Story" },
  { id: "16:9", label: "Landscape" },
];

const moods = [
  { name: "Just my brand", meta: "Default", active: false },
  { name: "Christmas", meta: "Right now", active: false },
  { name: "Midsummer", meta: "Right now", active: false },
  { name: "Minimalist Tech", meta: "Always available", active: true },
  { name: "Editorial", meta: "Always available", active: false },
];

const toggles = [
  "Use brand colors",
  "Use brand logo",
  "Use brand fonts",
  "Apply mood prompt modifiers",
  "Apply mood decorative motifs",
];

const variants = [
  "Quiet product hero",
  "Offer-led portrait",
  "Lifestyle variation",
  "CTA-forward card",
];

export function GenerateForm() {
  return (
    <div className="generate-layout">
      <section className="generate-primary">
        <div className="generate-header">
          <span className="generate-kicker">Generation flow</span>
          <h1>New generation</h1>
          <p>
            Describe what you want. Studio applies brand grounding, mood styling, and output sizing
            from the approved interface direction.
          </p>
        </div>

        <div className="generate-section">
          <label className="generate-label" htmlFor="brief">
            Brief
          </label>
          <div className="generate-textarea-wrap">
            <textarea
              className="generate-textarea"
              id="brief"
              defaultValue="Christmas sale, cozy living room with a glowing tree, 30% off."
            />
            <span className="generate-counter">67 / 500</span>
          </div>
        </div>

        <div className="generate-grid-two">
          <div className="generate-section">
            <label className="generate-label">Brand</label>
            <div className="generate-select-card">
              <span className="generate-select-card__mark">NW</span>
              <div>
                <strong>Northwind Coffee</strong>
                <span>Logo, palette, typography, and voice kit loaded</span>
              </div>
            </div>
          </div>

          <div className="generate-section">
            <label className="generate-label">Output target</label>
            <div className="generate-chip-row">
              <span className="generate-chip is-active">For social</span>
              <span className="generate-chip">Just an image</span>
            </div>
          </div>
        </div>

        <div className="generate-section">
          <label className="generate-label">Mood</label>
          <div className="generate-mood-row">
            {moods.map((mood) => (
              <div
                key={mood.name}
                className={`generate-mood-card${mood.active ? " is-active" : ""}`}
              >
                <div className="generate-mood-card__art" />
                <strong>{mood.name}</strong>
                <span>{mood.meta}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="generate-section">
          <label className="generate-label">Aspect ratio</label>
          <div className="generate-chip-row">
            {aspectRatios.map((ratio) => (
              <span
                key={ratio.id}
                className={`generate-chip${ratio.id === "4:5" ? " is-active" : ""}`}
              >
                {ratio.id} · {ratio.label}
              </span>
            ))}
          </div>
        </div>

        <div className="generate-actions">
          <button className="generate-button" type="button">
            Generate 4 variants
          </button>
          <button className="generate-button generate-button--secondary" type="button">
            Save draft
          </button>
          <span className="generate-actions__meta">20 credits total</span>
        </div>
      </section>

      <aside className="generate-sidebar">
        <div className="generate-panel">
          <span className="generate-panel__eyebrow">Brand grounding</span>
          <div className="generate-toggle-list">
            {toggles.map((toggle) => (
              <div key={toggle} className="generate-toggle-row">
                <span>{toggle}</span>
                <span className="generate-switch is-on" />
              </div>
            ))}
            <div className="generate-toggle-row">
              <span>Brand-strict mode</span>
              <span className="generate-switch" />
            </div>
            <div className="generate-toggle-row">
              <span>Premium model</span>
              <span className="generate-switch" />
            </div>
          </div>
        </div>

        <div className="generate-panel">
          <span className="generate-panel__eyebrow">Selection summary</span>
          <strong className="generate-panel__title">Portrait campaign run</strong>
          <p>4:5 portrait, 4 variants, Minimalist Tech mood, Flux 1.1 Pro default route.</p>
          <div className="generate-summary-row">
            <span>Estimated cost</span>
            <strong>20 credits</strong>
          </div>
        </div>

        <div className="generate-panel">
          <span className="generate-panel__eyebrow">Expected results</span>
          <div className="generate-variant-grid">
            {variants.map((variant) => (
              <div key={variant} className="generate-variant-card">
                <div className="generate-variant-card__art" />
                <span>{variant}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
