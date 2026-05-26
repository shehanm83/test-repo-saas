"use client";

import { GenerateShell } from "./commercial/generate-shell";
import type { BrandLite, MoodLite, ProductLite } from "./commercial/types";

export function Generate(props: {
  brands: BrandLite[];
  moods: MoodLite[];
  products?: ProductLite[];
  credits: number;
  planSegment?: "free" | "subscription" | "payg";
}) {
  return (
    <GenerateShell
      brands={props.brands}
      moods={props.moods}
      products={props.products ?? []}
      credits={props.credits}
      planSegment={props.planSegment ?? "subscription"}
    />
  );
}
