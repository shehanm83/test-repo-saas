"use client";

import { CampaignShell } from "@/components/campaign/campaign-shell";
import {
  FIXTURE_BRANDS,
  FIXTURE_BRIEF,
  FIXTURE_PRODUCTS,
} from "@/components/campaign/brief/fixtures";

/**
 * Slice 60·A — the campaign workspace, rendered from the Cold Brew Season
 * fixture. 60·D loads the campaign by id.
 */
export default function CampaignPage() {
  return (
    <CampaignShell
      initialForm={FIXTURE_BRIEF}
      brands={FIXTURE_BRANDS}
      products={FIXTURE_PRODUCTS}
    />
  );
}
