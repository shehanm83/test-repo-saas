"use client";

import { CampaignShell } from "@/components/campaign/campaign-shell";
import {
  emptyBrief,
  FIXTURE_BRANDS,
  FIXTURE_PRODUCTS,
} from "@/components/campaign/brief/fixtures";

/**
 * Slice 60·A — Brief screen against a local fixture. No API, no DB.
 * 60·D swaps the fixture for the workspace's real brands and products.
 */
export default function NewCampaignPage() {
  const defaultBrandId = FIXTURE_BRANDS.length === 1 ? FIXTURE_BRANDS[0]!.id : "";
  return (
    <CampaignShell
      initialForm={emptyBrief(defaultBrandId)}
      brands={FIXTURE_BRANDS}
      products={FIXTURE_PRODUCTS}
    />
  );
}
