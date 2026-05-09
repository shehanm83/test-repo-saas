import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ModelDetail } from "@/components/admin/model-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const model = {
  code: "flux-1.1-pro",
  displayName: "Flux 1.1 Pro",
  description: "High-quality model",
  vendor: "black-forest-labs",
  llmModelId: "flux-1.1-pro",
  status: "active" as const,
};

const allStrengths = [
  { code: "photoreal", label: "Photoreal" },
  { code: "stylized", label: "Stylized" },
];
const allTags = [{ code: "fast", label: "Fast" }];
const routing = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    tierCode: "premium",
    strengthCode: "photoreal",
    modelCode: "flux-1.1-pro",
    isDefault: true,
    sortOrder: 0,
  },
];

describe("ModelDetail", () => {
  it("renders the basics, assigned strengths, and routing sections", () => {
    render(
      React.createElement(ModelDetail, {
        model,
        allStrengths,
        allTags,
        routing,
        assignedStrengths: ["photoreal"],
        assignedTags: ["fast"],
      }),
    );

    // Title
    expect(screen.getByRole("heading", { name: "Flux 1.1 Pro" })).toBeInTheDocument();
    // Sections
    expect(screen.getByRole("heading", { name: "Basics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Strengths" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tags" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Routing" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Danger zone" })).toBeInTheDocument();
    // Assigned strength chip
    expect(screen.getByText("Photoreal")).toBeInTheDocument();
    expect(screen.getByLabelText(/remove strength photoreal/i)).toBeInTheDocument();
    // Assigned tag chip — there's also a datalist <option label="Fast">, so allow multiple
    expect(screen.getAllByText("Fast").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/remove tag fast/i)).toBeInTheDocument();
    // Routing default badge
    expect(screen.getByText("Default")).toBeInTheDocument();
  });
});
