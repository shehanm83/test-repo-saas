"use client";

import type { TemplateSelection } from "./types";

const FAMILIES = [
  { id: "product_hero", label: "Product hero", layouts: ["centered_product_hero", "left_text_right_product", "split_offer"] },
  { id: "sale_poster", label: "Sale poster", layouts: ["badge_overlay", "price_first", "retail_window"] },
  { id: "social_ad", label: "Social ad", layouts: ["ugc_clean", "headline_first", "feed_card"] },
  { id: "leaflet_catalogue", label: "Leaflet catalogue", layouts: ["grid_catalogue", "weekly_offer", "service_menu"] },
  { id: "bundle_offer", label: "Bundle offer", layouts: ["bundle_stack", "three_item_offer", "kit_flatlay"] },
];

export function TemplateLayoutStep(props: {
  value: TemplateSelection;
  onChange: (value: TemplateSelection) => void;
}) {
  const activeFamily = FAMILIES.find((family) => family.id === props.value.family) ?? FAMILIES[0]!;

  return (
    <div className="cg-step-stack">
      <div className="cg-option-grid">
        {FAMILIES.map((family) => (
          <button
            type="button"
            key={family.id}
            className={`cg-option ${props.value.family === family.id ? "is-selected" : ""}`}
            onClick={() => props.onChange({ family: family.id, layout: family.layouts[0]! })}
          >
            <strong>{family.label}</strong>
            <span>{family.id.replaceAll("_", " ")}</span>
          </button>
        ))}
      </div>
      <div>
        <span className="label">Layout</span>
        <div className="cg-option-grid cg-option-grid--three">
          {activeFamily.layouts.map((layout) => (
            <button
              type="button"
              key={layout}
              className={`cg-layout-tile ${props.value.layout === layout ? "is-selected" : ""}`}
              onClick={() => props.onChange({ ...props.value, layout })}
            >
              <span className="cg-layout-preview" />
              <strong>{layout.replaceAll("_", " ")}</strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
