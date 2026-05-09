"use client";

import { GenerateShell } from "./commercial/generate-shell";
import type {
  BrandLite,
  MoodLite,
  ProductLite,
  StrengthLite,
  TierOptionsLite,
  UseCaseLite,
} from "./commercial/types";

export function Generate(props: {
  brands: BrandLite[];
  moods: MoodLite[];
  products?: ProductLite[];
  credits: number;
  // Sub-project A + C lookups. Optional so legacy tests can omit them; in
  // production the page always passes them.
  useCases?: UseCaseLite[];
  tierOptions?: TierOptionsLite;
  strengths?: StrengthLite[];
}) {
  return (
    <GenerateShell
      brands={props.brands}
      moods={props.moods}
      products={props.products ?? []}
      credits={props.credits}
      useCases={props.useCases ?? []}
      tierOptions={props.tierOptions ?? { standard: null, premium: {} }}
      strengths={props.strengths ?? []}
    />
  );
}
