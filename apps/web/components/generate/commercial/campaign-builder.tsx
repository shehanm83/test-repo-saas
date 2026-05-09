"use client";

import { BrandMoodStep } from "./brand-mood-step";
import { CampaignDetailsStep } from "./campaign-details-step";
import { CompositionStep } from "./composition-step";
import { CreationTypeStep } from "./creation-type-step";
import { OutputSettingsStep } from "./output-settings-step";
import { ProductStep } from "./product-step";
import { TemplateLayoutStep } from "./template-layout-step";
import type {
  BrandLite,
  CreationType,
  GenerateState,
  MoodLite,
  ProductLite,
  ProductRole,
  SelectedProduct,
} from "./types";

const STEPS = [
  "Creation type",
  "Products",
  "Campaign details",
  "Template",
  "Brand and mood",
  "Composition",
  "Output settings",
  "Review",
];

export function CampaignBuilder(props: {
  state: GenerateState;
  brands: BrandLite[];
  moods: MoodLite[];
  products: ProductLite[];
  canSubmit: boolean;
  onStepChange: (step: number) => void;
  onCreationTypeChange: (creationType: CreationType) => void;
  onBriefChange: (brief: string) => void;
  onCampaignChange: (patch: Partial<GenerateState["campaign"]>) => void;
  onTemplateChange: (template: GenerateState["template"]) => void;
  onCompositionChange: (composition: GenerateState["composition"]) => void;
  onOutputsChange: (outputs: GenerateState["outputs"]) => void;
  onAddProduct: (product: SelectedProduct) => void;
  onRemoveProduct: (localId: string) => void;
  onProductRoleChange: (localId: string, role: ProductRole) => void;
  onBrandChange: (brandId: string) => void;
  onMoodChange: (moodId: string | null) => void;
  onFlagsChange: (flags: GenerateState["flags"]) => void;
}) {
  const active = props.state.activeStep;
  const canProceed = stepIsComplete(props.state, active);

  return (
    <div className="cg-builder">
      <nav className="cg-stepper" aria-label="Campaign builder steps">
        {STEPS.map((step, index) => {
          const complete = stepIsComplete(props.state, index);
          return (
            <button
              key={step}
              type="button"
              className={`${active === index ? "is-active" : ""} ${complete ? "is-complete" : ""}`}
              onClick={() => {
                if (index <= active || complete || stepIsComplete(props.state, index - 1)) props.onStepChange(index);
              }}
            >
              <span>{index + 1}</span>
              {step}
            </button>
          );
        })}
      </nav>

      <section className="cg-panel">
        <div className="cg-section-head">
          <div>
            <span className="cg-kicker">Step {active + 1} of 8</span>
            <h2>{STEPS[active]}</h2>
          </div>
        </div>

        {active === 0 ? (
          <CreationTypeStep value={props.state.creationType} onChange={props.onCreationTypeChange} />
        ) : null}
        {active === 1 ? (
          <ProductStep
            products={props.products}
            selected={props.state.selectedProducts}
            brandId={props.state.brandId}
            onAdd={props.onAddProduct}
            onRemove={props.onRemoveProduct}
            onUpdateRole={props.onProductRoleChange}
          />
        ) : null}
        {active === 2 ? (
          <CampaignDetailsStep
            brief={props.state.brief}
            campaign={props.state.campaign}
            onBriefChange={props.onBriefChange}
            onChange={props.onCampaignChange}
          />
        ) : null}
        {active === 3 ? (
          <TemplateLayoutStep value={props.state.template} onChange={props.onTemplateChange} />
        ) : null}
        {active === 4 ? (
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
        ) : null}
        {active === 5 ? (
          <CompositionStep value={props.state.composition} onChange={props.onCompositionChange} />
        ) : null}
        {active === 6 ? (
          <OutputSettingsStep value={props.state.outputs} onChange={props.onOutputsChange} multiFormat />
        ) : null}
        {active === 7 ? (
          <div className="cg-review-copy">
            <strong>Review the right rail before generating.</strong>
            <span>
              The rail shows product count, selected formats, server-side warnings, and the credit estimate used by the generation API.
            </span>
          </div>
        ) : null}

        <div className="cg-builder-actions">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={active === 0}
            onClick={() => props.onStepChange(Math.max(0, active - 1))}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={active === STEPS.length - 1 ? !props.canSubmit : !canProceed}
            onClick={() => props.onStepChange(Math.min(STEPS.length - 1, active + 1))}
          >
            {active === STEPS.length - 1 ? "Ready in rail" : "Next"}
          </button>
        </div>
      </section>
    </div>
  );
}

function stepIsComplete(state: GenerateState, step: number) {
  if (step < 0) return true;
  switch (step) {
    case 0:
      return state.creationType.length > 0;
    case 1:
      return state.selectedProducts.length > 0;
    case 2:
      return state.brief.trim().length > 0;
    case 3:
      return state.template.family.length > 0 && state.template.layout.length > 0;
    case 4:
      return state.brandId.length > 0;
    case 5:
      return state.composition.productSize.length > 0;
    case 6:
      return state.outputs.formats.length > 0;
    case 7:
      return state.brandId.length > 0 && state.selectedProducts.length > 0 && state.brief.trim().length > 0;
    default:
      return false;
  }
}
