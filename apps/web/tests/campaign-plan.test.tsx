import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CampaignShell } from "@/components/campaign/campaign-shell";
import { createEmptyCampaignPlan, deliverableReady } from "@/components/campaign/plan/plan-data";
import type { CampaignBriefForm } from "@/components/campaign/types";
import type { BrandLite, ProductLite } from "@/components/generate/commercial/types";

const brands: BrandLite[] = [
  {
    id: "brand-atlas",
    name: "Atlas Coffee",
    palette: ["#284b3f", "#f2dfc4"],
    logoAssets: [],
  },
];

const products: ProductLite[] = [
  {
    id: "product-cold-brew",
    brandId: "brand-atlas",
    name: "Cold Brew Concentrate 1L",
    title: "Cold Brew Concentrate",
    description: "An 18-hour, low-acid coffee concentrate.",
  },
];

const brief: CampaignBriefForm = {
  name: "Cold Brew Season",
  recipe: "product_launch",
  brandId: "brand-atlas",
  productRefs: [
    {
      localId: "selected-cold-brew",
      source: "saved",
      role: "hero",
      productId: "product-cold-brew",
      commercialFields: { name: "Cold Brew Concentrate 1L", title: "Cold Brew Concentrate" },
    },
  ],
  platforms: ["instagram", "facebook", "tiktok"],
  startsOn: "2026-09-01",
  endsOn: "2026-09-21",
  brief: "Launching our 18-hour cold brew concentrate for the last warm stretch of the year.",
  goal: "conversion",
  audience: "Home coffee drinkers",
  offer: { discount: "20% off", code: "SLOWDRIP", expiresAt: "2026-09-21T23:59" },
};

describe("campaign plan", () => {
  it("starts empty and never invents strategy, copy, or content", () => {
    const plan = createEmptyCampaignPlan(brief);

    expect(plan.version).toBe(3);
    expect(plan.deliverables).toEqual([]);
  });

  it("maps a real deliverable to a campaign week without exact dates", () => {
    render(<CampaignShell initialForm={brief} brands={brands} products={products} />);

    fireEvent.click(screen.getByRole("button", { name: /continue to deliverables/i }));

    expect(screen.getByText("No deliverables defined")).toBeInTheDocument();
    expect(screen.queryByText("Tease")).not.toBeInTheDocument();
    expect(screen.queryByText("Build anticipation")).not.toBeInTheDocument();
    expect(screen.queryByText(/credits/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /no deliverables defined/i }));
    fireEvent.change(screen.getByLabelText("Deliverable name"), {
      target: { value: "Product demo reel" },
    });
    fireEvent.change(screen.getByLabelText("Campaign week"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save deliverable/i }));

    expect(screen.getAllByText("Product demo reel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Week 2").length).toBeGreaterThan(0);
    expect(screen.queryByText(/production workback/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/publish date/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continue to visual direction/i }));
    expect(screen.getByRole("heading", { name: "One look, decided once" })).toBeInTheDocument();
  });

  it("requires a valid campaign week", () => {
    const deliverable = {
      id: "deliverable-1",
      title: "Product demo reel",
      objective: "conversion" as const,
      audience: "Home coffee drinkers",
      message: "A faster way to make smooth cold brew at home.",
      callToAction: "Shop now",
      formatId: "instagram_reel_9_16",
      campaignSlot: 2,
    };

    expect(deliverableReady(deliverable, 3)).toBe(true);
    expect(deliverableReady({ ...deliverable, campaignSlot: 4 }, 3)).toBe(false);
  });

  it("adapts short campaigns to relative campaign days", () => {
    render(
      <CampaignShell
        initialForm={{ ...brief, startsOn: "2026-09-01", endsOn: "2026-09-02" }}
        brands={brands}
        products={products}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue to deliverables/i }));
    expect(screen.getByText(/campaign timeline · 2 days/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /no deliverables defined/i }));
    expect(screen.getByLabelText("Campaign day")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Day 1" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Day 2" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Day 3" })).not.toBeInTheDocument();
  });
});
