import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { StrengthsAdmin } from "@/components/admin/strengths-admin";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const rows = [
  {
    code: "photoreal",
    label: "Photoreal",
    description: "Ultra-realistic imagery",
    icon: null,
    sortOrder: 10,
  },
];

describe("StrengthsAdmin", () => {
  it("renders the strengths table", () => {
    render(React.createElement(StrengthsAdmin, { rows }));

    expect(screen.getByText("Strengths")).toBeInTheDocument();
    expect(screen.getByText("photoreal")).toBeInTheDocument();
    expect(screen.getByText("Photoreal")).toBeInTheDocument();
    expect(screen.getByText("Ultra-realistic imagery")).toBeInTheDocument();
  });

  it("opens the create modal when the New strength button is clicked", () => {
    render(React.createElement(StrengthsAdmin, { rows }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /new strength/i }));
    expect(screen.getByRole("dialog", { name: /create strength/i })).toBeInTheDocument();
  });
});
