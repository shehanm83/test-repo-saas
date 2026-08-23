import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BriefScreen } from "@/components/campaign/brief/brief-screen";
import { emptyBrief } from "@/components/campaign/brief/defaults";
import type { BrandLite } from "@/components/generate/commercial/types";

const brands: BrandLite[] = [
  {
    id: "brand-atlas",
    name: "Atlas Coffee",
    palette: ["#111111", "#f4eee5", "#d1663f"],
    fonts: {
      heading: { family: "Pacifico", weight: "400" },
      body: { family: "Inter", weight: "400" },
    },
    logoAssets: [{ id: "atlas-logo", url: "/atlas-logo.svg" }],
  },
];

describe("campaign brief brands", () => {
  it("shows an actionable empty state when the workspace has no brands", () => {
    render(
      <BriefScreen
        form={emptyBrief("")}
        brands={[]}
        products={[]}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Brand")).toBeDisabled();
    expect(screen.getByRole("option", { name: "No brands in this workspace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a brand" })).toHaveAttribute(
      "href",
      "/brands/new",
    );
  });

  it("selects a real brand and shows its saved kit in the side panel", () => {
    const onChange = vi.fn();
    const form = emptyBrief("");

    const { rerender } = render(
      <BriefScreen
        form={form}
        brands={brands}
        products={[]}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: "Atlas Coffee" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Brand"), { target: { value: "brand-atlas" } });
    expect(onChange).toHaveBeenCalledWith({ ...form, brandId: "brand-atlas" });

    rerender(
      <BriefScreen
        form={{ ...form, brandId: "brand-atlas" }}
        brands={brands}
        products={[]}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByAltText("Atlas Coffee logo")).toHaveAttribute("src", "/atlas-logo.svg");
    expect(screen.getByLabelText("Atlas Coffee palette")).toBeInTheDocument();
    expect(screen.getByText("Pacifico")).toBeInTheDocument();
    expect(screen.getByText("Inter")).toBeInTheDocument();
  });
});
