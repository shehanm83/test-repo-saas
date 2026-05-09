import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { RoutingAdmin } from "@/components/admin/routing-admin";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const routing = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    tierCode: "premium",
    strengthCode: "text-rendering",
    modelCode: "text-master",
    isDefault: true,
    sortOrder: 0,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    tierCode: "premium",
    strengthCode: "text-rendering",
    modelCode: "ideogram-v2",
    isDefault: false,
    sortOrder: 1,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    tierCode: "standard",
    strengthCode: null,
    modelCode: "flux-1.1-pro",
    isDefault: true,
    sortOrder: 0,
  },
];

const models = [
  {
    code: "text-master",
    displayName: "Text Master",
    vendor: "openai",
    status: "active" as const,
  },
  {
    code: "ideogram-v2",
    displayName: "Ideogram v2",
    vendor: "ideogram",
    status: "active" as const,
  },
  {
    code: "flux-1.1-pro",
    displayName: "Flux 1.1 Pro",
    vendor: "black-forest-labs",
    status: "active" as const,
  },
];

const strengths = [{ code: "text-rendering", label: "Text rendering" }];

describe("RoutingAdmin", () => {
  it("groups rows into bucket cards", () => {
    render(React.createElement(RoutingAdmin, { routing, models, strengths }));

    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Premium · Text rendering")).toBeInTheDocument();
    // Default badges - one per bucket
    expect(screen.getAllByText("DEFAULT").length).toBe(2);
  });

  it("opens the bucket panel when Edit is clicked", () => {
    render(React.createElement(RoutingAdmin, { routing, models, strengths }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Find the Premium · Text rendering card and click its Edit button
    const premiumCard = screen.getByText("Premium · Text rendering").closest(".card");
    expect(premiumCard).toBeTruthy();
    const editButton = premiumCard!.querySelector("button");
    fireEvent.click(editButton!);

    const dialog = screen.getByRole("dialog", {
      name: /edit routing bucket premium · text rendering/i,
    });
    expect(dialog).toBeInTheDocument();

    // Default model should appear in the panel with DEFAULT badge
    expect(dialog.textContent).toContain("Text Master");
    expect(dialog.textContent).toContain("Ideogram v2");
    expect(dialog.textContent).toContain("DEFAULT");
  });
});
