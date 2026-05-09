import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { UseCasesAdmin } from "@/components/admin/use-cases-admin";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const rows = [
  {
    code: "ig-story",
    label: "Instagram Story",
    platform: "instagram",
    targetWidth: 1080,
    targetHeight: 1920,
    aspectRatio: "9:16",
    icon: "🟪",
    sortOrder: 4,
    status: "active" as const,
  },
];

describe("UseCasesAdmin", () => {
  it("renders the use-cases table", () => {
    render(React.createElement(UseCasesAdmin, { rows }));

    expect(screen.getByText("Use cases")).toBeInTheDocument();
    expect(screen.getByText("ig-story")).toBeInTheDocument();
    expect(screen.getByText("Instagram Story")).toBeInTheDocument();
    expect(screen.getByText("1080×1920")).toBeInTheDocument();
    expect(screen.getByText("9:16")).toBeInTheDocument();
  });

  it("opens the create modal when the New use case button is clicked", () => {
    render(React.createElement(UseCasesAdmin, { rows }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /new use case/i }));
    expect(screen.getByRole("dialog", { name: /create use case/i })).toBeInTheDocument();
  });
});
