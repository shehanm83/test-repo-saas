"use client";

import React from "react";

import {
  QuickCreateWizard,
  type StrengthDTO,
  type TierOptionsDTO,
  type UseCaseDTO,
} from "./quick-create-wizard";

export function GeneratePageClient(props: {
  brandId: string | null;
  credits: number;
  useCases: UseCaseDTO[];
  tierOptions: TierOptionsDTO;
  strengths: StrengthDTO[];
}) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Generate</h1>
          <p className="page__sub">
            Pick a use case, a quality tier, and a resolution. {props.credits} credits available.
          </p>
        </div>
      </div>
      <QuickCreateWizard
        brandId={props.brandId}
        useCases={props.useCases}
        tierOptions={props.tierOptions}
        strengths={props.strengths}
      />
    </div>
  );
}
