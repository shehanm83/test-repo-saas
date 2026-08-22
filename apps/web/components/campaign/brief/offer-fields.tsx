"use client";

import type { CampaignBriefForm } from "../types";

import { BOX_INPUT, FieldBox } from "./field-box";

export function OfferFields(props: {
  value: CampaignBriefForm["offer"];
  onChange: (offer: CampaignBriefForm["offer"]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <FieldBox label="Discount" className="w-[150px]">
        <input
          className={BOX_INPUT}
          value={props.value.discount}
          placeholder="20% off"
          onChange={(event) => props.onChange({ ...props.value, discount: event.target.value })}
        />
      </FieldBox>
      <FieldBox label="Code" className="w-[150px]">
        <input
          className={BOX_INPUT}
          value={props.value.code}
          placeholder="SLOWDRIP"
          onChange={(event) => props.onChange({ ...props.value, code: event.target.value })}
        />
      </FieldBox>
      <FieldBox label="Expires" className="w-[210px]">
        <input
          type="datetime-local"
          className={BOX_INPUT}
          value={props.value.expiresAt}
          onChange={(event) => props.onChange({ ...props.value, expiresAt: event.target.value })}
        />
      </FieldBox>
    </div>
  );
}
