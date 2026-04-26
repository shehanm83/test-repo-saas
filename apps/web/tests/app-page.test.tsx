import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect called");
  }),
}));

vi.mock("@/lib/auth/server", () => ({
  getServerSession: vi.fn(async () => null),
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the primary value proposition", async () => {
    const ui = await HomePage();
    render(ui);

    expect(
      screen.getByRole("heading", {
        name: /on-brand images,\s*in a sentence\./i,
      }),
    ).toBeInTheDocument();
  });
});
