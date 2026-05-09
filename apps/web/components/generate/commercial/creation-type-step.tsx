"use client";

import type { CreationType } from "./types";

const OPTIONS: Array<{ id: CreationType; label: string; description: string }> = [
  { id: "single_product", label: "Single product", description: "Hero image for one product." },
  { id: "product_bundle", label: "Product bundle", description: "Group related items into one offer." },
  { id: "campaign_set", label: "Campaign set", description: "One idea across several placements." },
  { id: "leaflet_catalogue", label: "Leaflet catalogue", description: "Dense retail or service catalogue." },
  { id: "comparison", label: "Comparison", description: "Before/after or side-by-side choice." },
  { id: "social_ad_pack", label: "Social ad pack", description: "CTA-led ads across feeds and stories." },
];

export function CreationTypeStep(props: {
  value: CreationType;
  onChange: (value: CreationType) => void;
}) {
  return (
    <div className="cg-option-grid cg-option-grid--three">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`cg-option ${props.value === option.id ? "is-selected" : ""}`}
          onClick={() => props.onChange(option.id)}
        >
          <strong>{option.label}</strong>
          <span>{option.description}</span>
        </button>
      ))}
    </div>
  );
}
