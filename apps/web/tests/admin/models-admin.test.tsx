import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ModelsAdmin } from "@/components/admin/models-admin";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const rows = [
  {
    code: "flux-1.1-pro",
    displayName: "Flux 1.1 Pro",
    description: null,
    vendor: "black-forest-labs",
    llmModelId: "flux-1.1-pro",
    status: "active" as const,
  },
  {
    code: "gpt-image-1",
    displayName: "GPT Image 1",
    description: null,
    vendor: "openai",
    llmModelId: "gpt-image-1",
    status: "active" as const,
  },
  {
    code: "ideogram-v2",
    displayName: "Ideogram v2",
    description: null,
    vendor: "ideogram",
    llmModelId: "ideogram-v2",
    status: "paused" as const,
  },
];

describe("ModelsAdmin", () => {
  it("renders all rows initially", () => {
    render(React.createElement(ModelsAdmin, { rows }));
    expect(screen.getByText("Flux 1.1 Pro")).toBeInTheDocument();
    expect(screen.getByText("GPT Image 1")).toBeInTheDocument();
    expect(screen.getByText("Ideogram v2")).toBeInTheDocument();
  });

  it("filters rows by code substring", () => {
    render(React.createElement(ModelsAdmin, { rows }));
    fireEvent.change(screen.getByLabelText(/filter by code/i), {
      target: { value: "flux" },
    });
    expect(screen.getByText("Flux 1.1 Pro")).toBeInTheDocument();
    expect(screen.queryByText("GPT Image 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Ideogram v2")).not.toBeInTheDocument();
  });

  it("filters rows by status", () => {
    render(React.createElement(ModelsAdmin, { rows }));
    fireEvent.change(screen.getByLabelText(/filter by status/i), {
      target: { value: "paused" },
    });
    expect(screen.queryByText("Flux 1.1 Pro")).not.toBeInTheDocument();
    expect(screen.getByText("Ideogram v2")).toBeInTheDocument();
  });
});
