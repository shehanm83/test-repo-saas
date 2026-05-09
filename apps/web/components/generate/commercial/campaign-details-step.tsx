"use client";

import type { CampaignDetails } from "./types";

export function CampaignDetailsStep(props: {
  brief: string;
  campaign: CampaignDetails;
  onBriefChange: (value: string) => void;
  onChange: (patch: Partial<CampaignDetails>) => void;
}) {
  return (
    <div className="cg-step-stack">
      <label>
        <span className="label">Creative brief</span>
        <textarea
          className="textarea cg-brief"
          value={props.brief}
          onChange={(event) => props.onBriefChange(event.target.value)}
          placeholder="Spring launch for a clean skincare product, bright bathroom set, premium but approachable."
          maxLength={500}
        />
      </label>
      <div className="cg-field-row">
        <label>
          <span className="label">Campaign title</span>
          <input
            className="input"
            value={props.campaign.title}
            onChange={(event) => props.onChange({ title: event.target.value })}
            placeholder="Glow starts here"
          />
        </label>
        <label>
          <span className="label">Subtitle</span>
          <input
            className="input"
            value={props.campaign.subtitle}
            onChange={(event) => props.onChange({ subtitle: event.target.value })}
            placeholder="Hydration for every morning"
          />
        </label>
      </div>
      <div className="cg-field-row cg-field-row--three">
        <label>
          <span className="label">Price</span>
          <input
            className="input"
            value={props.campaign.price}
            onChange={(event) => props.onChange({ price: event.target.value })}
            placeholder="$29"
          />
        </label>
        <label>
          <span className="label">Discount</span>
          <input
            className="input"
            value={props.campaign.discount}
            onChange={(event) => props.onChange({ discount: event.target.value })}
            placeholder="20% off"
          />
        </label>
        <label>
          <span className="label">CTA</span>
          <input
            className="input"
            value={props.campaign.cta}
            onChange={(event) => props.onChange({ cta: event.target.value })}
            placeholder="Shop now"
          />
        </label>
      </div>
      <label>
        <span className="label">Message</span>
        <textarea
          className="textarea"
          value={props.campaign.message}
          onChange={(event) => props.onChange({ message: event.target.value })}
          placeholder="What should the audience understand or feel?"
        />
      </label>
      <div className="cg-field-row">
        <label>
          <span className="label">Benefits</span>
          <input
            className="input"
            value={props.campaign.benefitsText}
            onChange={(event) => props.onChange({ benefitsText: event.target.value })}
            placeholder="Fast hydration, clean ingredients, travel friendly"
          />
        </label>
        <label>
          <span className="label">Target audience</span>
          <input
            className="input"
            value={props.campaign.targetAudience}
            onChange={(event) => props.onChange({ targetAudience: event.target.value })}
            placeholder="Busy professionals, 25-40"
          />
        </label>
      </div>
      <div className="cg-field-row cg-field-row--three">
        <label>
          <span className="label">Offer expiry</span>
          <input
            className="input"
            value={props.campaign.offerExpiry}
            onChange={(event) => props.onChange({ offerExpiry: event.target.value })}
            placeholder="2026-06-30"
          />
        </label>
        <label>
          <span className="label">Website</span>
          <input
            className="input"
            value={props.campaign.website}
            onChange={(event) => props.onChange({ website: event.target.value })}
            placeholder="vyora.example"
          />
        </label>
        <label>
          <span className="label">QR URL</span>
          <input
            className="input"
            value={props.campaign.qrUrl}
            onChange={(event) => props.onChange({ qrUrl: event.target.value })}
            placeholder="https://example.com/offer"
          />
        </label>
      </div>
      <label>
        <span className="label">Legal text</span>
        <input
          className="input"
          value={props.campaign.legalText}
          onChange={(event) => props.onChange({ legalText: event.target.value })}
          placeholder="Terms apply. While stocks last."
        />
      </label>
    </div>
  );
}
