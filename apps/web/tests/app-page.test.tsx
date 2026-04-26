import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the primary value proposition", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /on-brand images,\s*in a sentence\./i,
      }),
    ).toBeInTheDocument();
  });
});
