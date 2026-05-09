import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { TagsAdmin } from "@/components/admin/tags-admin";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const rows = [
  {
    code: "text-rendering",
    label: "Text rendering",
    description: "Models good at rendering legible text",
  },
];

describe("TagsAdmin", () => {
  it("renders the tags table", () => {
    render(React.createElement(TagsAdmin, { rows }));

    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("text-rendering")).toBeInTheDocument();
    expect(screen.getByText("Text rendering")).toBeInTheDocument();
  });

  it("opens the create modal when the New tag button is clicked", () => {
    render(React.createElement(TagsAdmin, { rows }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /new tag/i }));
    expect(screen.getByRole("dialog", { name: /create tag/i })).toBeInTheDocument();
  });
});
