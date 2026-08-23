"use client";

import { GenerateShell } from "./commercial/generate-shell";
import type { BrandLite, MoodLite, ProductLite, StockAssetLite } from "./commercial/types";

export function Generate(props: {
  brands: BrandLite[];
  moods: MoodLite[];
  products?: ProductLite[];
  stockAssets?: StockAssetLite[];
  credits: number;
  planSegment?: "free" | "subscription" | "payg";
  quickCreateV2?: boolean;
}) {
  return (
    <GenerateShell
      brands={props.brands}
      moods={props.moods}
      products={props.products ?? []}
      stockAssets={props.stockAssets ?? []}
      credits={props.credits}
      planSegment={props.planSegment ?? "subscription"}
      quickCreateV2={props.quickCreateV2 ?? false}
    />
  );
}
