"use client";

import { CAMPAIGN_RECIPES, type CampaignRecipe } from "../types";

export function RecipePicker(props: {
  value: CampaignRecipe;
  onChange: (recipe: CampaignRecipe) => void;
}) {
  return (
    <div
      className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(168px,1fr))]"
      role="radiogroup"
      aria-label="What are you doing?"
    >
      {CAMPAIGN_RECIPES.map((recipe) => {
        const selected = recipe.id === props.value;
        return (
          <button
            key={recipe.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => props.onChange(recipe.id)}
            className={`rounded-2xl px-3.5 py-3.5 text-left transition-transform duration-150 hover:-translate-y-0.5 ${
              selected ? "bg-ink-deep text-white shadow-pill-dark" : "bg-white shadow-card"
            }`}
          >
            <b className="mb-[3px] block text-[13.5px] font-semibold">{recipe.label}</b>
            <span
              className={`block text-[11.5px] leading-[1.4] ${
                selected ? "text-white/65" : "text-ink-soft/70"
              }`}
            >
              {recipe.blurb}
            </span>
          </button>
        );
      })}
    </div>
  );
}
