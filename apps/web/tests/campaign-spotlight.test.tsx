import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import type { LandingHeroSetView } from "@layertone/shared/landing-hero";

import { CampaignSpotlight } from "@/components/marketing/v2/campaign-spotlight";

vi.mock("@/components/marketing/v2/reveal", () => ({
  Reveal: ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

const campaign: LandingHeroSetView = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Midsummer launch",
  status: "published",
  weight: 1,
  config: {
    headline: {
      line1: "Celebrate the season",
      line2Prefix: "with",
      line2Middle: "bright",
      line2Suffix: "campaigns.",
    },
    lede: "A seasonal campaign assembled from admin-managed content.",
    primaryCta: { label: "Start creating", href: "/sign-up" },
    secondaryCta: { label: "See the gallery", href: "#showcase", enabled: true },
    proofItems: ["Four finished concepts", "Brand-ready"],
    prompt: {
      brief: '"Create a joyful Midsummer launch"',
      brandName: "Northwind",
      brandInitials: "NW",
      swatches: ["#1F7A5A", "#FBE5C2"],
      moodName: "Midsummer",
    },
    trust: {
      label: "Created for teams like",
      teams: [{ name: "NORTHWIND", color: "#1F7A5A" }],
    },
  },
  cards: [1, 2, 3, 4].map((slot) => ({
    id: `card-${slot}`,
    slot,
    imageUrl: `https://example.com/card-${slot}.webp`,
    headline: `Concept ${slot}`,
    sub: `Campaign card ${slot}`,
    textPosition: slot % 2 === 0 ? "top" : "bottom",
    textColor: "white",
    brandInitials: "NW",
    brandColor: "#FFFFFF",
    brandTextColor: "#171310",
  })),
};

describe("CampaignSpotlight", () => {
  it("renders the complete published campaign without replacing its configured content", () => {
    render(<CampaignSpotlight campaign={campaign} isAuthed={false} />);

    expect(screen.getByRole("heading", { name: /celebrate the season/i })).toBeInTheDocument();
    expect(screen.getByText(campaign.config.lede)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start creating/i })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    expect(screen.getByRole("link", { name: /see the gallery/i })).toHaveAttribute(
      "href",
      "#showcase",
    );
    expect(screen.getByText("Create a joyful Midsummer launch")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByText("NORTHWIND")).toBeInTheDocument();
  });

  it("routes authenticated visitors to the existing generation flow", () => {
    render(<CampaignSpotlight campaign={campaign} isAuthed />);

    expect(screen.getByRole("link", { name: /open layertone/i })).toHaveAttribute(
      "href",
      "/generate",
    );
  });
});
