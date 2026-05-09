import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  QuickCreateWizard,
  type StrengthDTO,
  type TierOptionsDTO,
  type UseCaseDTO,
} from "@/components/generate/quick-create-wizard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const useCases: UseCaseDTO[] = [
  {
    code: "ig-post-1x1",
    label: "Instagram Post",
    platform: "instagram",
    targetWidth: 1080,
    targetHeight: 1080,
    aspectRatio: "1:1",
    icon: "🟪",
  },
  {
    code: "fb-landscape",
    label: "Facebook Landscape",
    platform: "facebook",
    targetWidth: 1280,
    targetHeight: 668,
    aspectRatio: "1.91:1",
    icon: "🟦",
  },
];

const tierOptions: TierOptionsDTO = {
  standard: { modelCode: "economy", displayName: "Economy" },
  premium: {
    photoreal: {
      defaultModelCode: "photoreal-pro",
      eligibleModelCodes: ["photoreal-pro", "photoreal-ultra"],
      modelsByCode: {
        "photoreal-pro": { displayName: "Photoreal Pro", description: null },
        "photoreal-ultra": { displayName: "Photoreal Ultra", description: null },
      },
    },
  },
};

const strengths: StrengthDTO[] = [
  { code: "photoreal", label: "Photoreal" },
  { code: "text", label: "Text rendering" },
];

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes("/api/generations/estimate")) {
      return new Response(
        JSON.stringify({
          totalCredits: 15,
          models: [{ modelCode: "photoreal-pro", displayName: "Photoreal Pro", credits: 15 }],
        }),
        { status: 200 },
      );
    }
    if (url.includes("/api/models/")) {
      return new Response(
        JSON.stringify({
          sizes: [
            { width: 1024, height: 1024, label: "Square" },
            { width: 1024, height: 1536, label: "Portrait" },
            { width: 1536, height: 1024, label: "Landscape" },
          ],
          allowCustomSize: true,
        }),
        { status: 200 },
      );
    }
    return new Response("not-mocked", { status: 404 });
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("QuickCreateWizard", () => {
  it("renders step 1 tiles and disables steps 2-3 until a use case is picked", () => {
    render(
      React.createElement(QuickCreateWizard, {
        useCases,
        tierOptions,
        strengths,
      }),
    );
    expect(screen.getByText("Step 1 · Where will this go?")).toBeInTheDocument();
    expect(screen.getByText("Instagram Post")).toBeInTheDocument();
    expect(screen.getByText("Facebook Landscape")).toBeInTheDocument();
    // Submit is disabled — no brief, no selection.
    expect(screen.getByRole("button", { name: /^submit$/i })).toBeDisabled();
  });

  it("advances through all three steps and enables submit", async () => {
    render(
      React.createElement(QuickCreateWizard, {
        useCases,
        tierOptions,
        strengths,
      }),
    );

    // Brief textarea
    fireEvent.change(screen.getByPlaceholderText(/What should we generate/i), {
      target: { value: "a holiday promo" },
    });

    // Step 1: pick Instagram Post (1:1).
    fireEvent.click(screen.getByText("Instagram Post"));
    expect(screen.getByText("Step 2 · How should it look?")).toBeInTheDocument();

    // Step 2: pick Premium → Photoreal.
    fireEvent.click(screen.getByRole("button", { name: /^Premium/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Photoreal$/i }));

    // Estimate fetch fires; wait for the size chips to render.
    await waitFor(() =>
      expect(screen.getByText("Step 3 · Pick a resolution")).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText(/1024×1024/)).toBeInTheDocument());

    // Step 3: pick the 1024×1024 size.
    fireEvent.click(screen.getByText(/1024×1024/));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^submit$/i })).not.toBeDisabled(),
    );
    // Estimate row shows the credits.
    expect(screen.getByText(/15 credits/)).toBeInTheDocument();
  });

  it("offers fallback CTA when no native size matches the chosen aspect", async () => {
    // 1.91:1 use case + a model whose only sizes are 1:1 — no match.
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/generations/estimate")) {
        return new Response(
          JSON.stringify({
            totalCredits: 15,
            models: [{ modelCode: "photoreal-pro", displayName: "Photoreal Pro", credits: 15 }],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/models/")) {
        return new Response(
          JSON.stringify({
            sizes: [{ width: 1024, height: 1024, label: "Square" }],
            allowCustomSize: false,
          }),
          { status: 200 },
        );
      }
      return new Response("not-mocked", { status: 404 });
    });

    render(
      React.createElement(QuickCreateWizard, {
        useCases,
        tierOptions,
        strengths,
      }),
    );

    fireEvent.click(screen.getByText("Facebook Landscape"));
    fireEvent.click(screen.getByRole("button", { name: /^Premium/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Photoreal$/i }));

    await waitFor(() => expect(screen.getByText(/No native size matches/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /try a different strength/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /generate at native size/i }),
    ).toBeInTheDocument();
  });
});
