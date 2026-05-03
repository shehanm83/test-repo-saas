import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Generate } from "@/components/generate/generate";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const brandId = "11111111-1111-4111-8111-111111111111";
const productId = "22222222-2222-4222-8222-222222222222";

const props = {
  brands: [{ id: brandId, name: "Test Brand", palette: ["#101828", "#1F7A5A"] }],
  moods: [{ id: "33333333-3333-4333-8333-333333333333", name: "Editorial", kind: "Evergreen", group: "always" as const }],
  products: [{ id: productId, brandId, name: "Serum", title: "Glow serum", priceMinor: 2900, currency: "USD" }],
  credits: 100,
};

describe("commercial generation page", () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/generations/preflight")) {
        return Response.json({
          blocking: [],
          warnings: [
            {
              code: "commercial.cta_missing",
              message: "Add a CTA so the ad has a clear commercial action.",
              field: "campaign.cta",
              severity: "medium",
            },
          ],
          estimate: { credits: 20, balance: 100, lineItems: [{ label: "2 standard variants", credits: 20 }] },
        });
      }
      if (url.endsWith("/api/generations")) {
        return Response.json({ generationId: "44444444-4444-4444-8444-444444444444" });
      }
      if (url.endsWith("/api/products")) {
        return Response.json({ id: "55555555-5555-4555-8555-555555555555" });
      }
      return Response.json({});
    }));
  });

  it("switches between Quick Create and Campaign Builder", () => {
    render(React.createElement(Generate, props));

    expect(screen.getByRole("tab", { name: "Quick Create" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Campaign Builder" }));

    expect(screen.getByRole("tab", { name: "Campaign Builder" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Step 1 of 8")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /social ad pack/i })).toBeInTheDocument();
  });

  it("keeps generate disabled until required quick fields are present", async () => {
    render(React.createElement(Generate, { ...props, products: [] }));

    const generate = screen.getByRole("button", { name: /generate images/i });
    expect(generate).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/creative brief/i), {
      target: { value: "Create a clean campaign image" },
    });

    await waitFor(() => expect(generate).toBeDisabled());
  });

  it("renders server preflight warnings in the review rail", async () => {
    render(React.createElement(Generate, props));

    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByLabelText(/creative brief/i), {
      target: { value: "Create a clean launch image" },
    });

    expect(await screen.findByText("Add a CTA so the ad has a clear commercial action.")).toBeInTheDocument();
    expect(screen.getAllByText("20").length).toBeGreaterThan(0);
  });

  it("submits the normalized commercial payload", async () => {
    const fetchMock = vi.mocked(fetch);
    render(React.createElement(Generate, props));

    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByLabelText(/creative brief/i), {
      target: { value: "Create a clean launch image" },
    });

    // enable promotion to expose CTA field
    fireEvent.click(screen.getByLabelText(/enable promotion/i));
    fireEvent.change(screen.getByLabelText(/cta/i), {
      target: { value: "Shop now" },
    });

    const generate = await screen.findByRole("button", { name: /generate images/i });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/generations/44444444-4444-4444-8444-444444444444"));
    const createCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/api/generations"));
    expect(createCall).toBeTruthy();
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      mode: "quick",
      creationType: "single_product",
      brandId,
      brief: "Create a clean launch image",
      campaign: { cta: "Shop now" },
      outputs: { variants: 2, quality: "standard", formats: ["instagram_square"] },
    });
    expect(body.productRefs).toEqual([
      expect.objectContaining({ productId, role: "hero" }),
    ]);
  });

  it("selecting Story/Reel sets instagram_story format in the payload", async () => {
    const fetchMock = vi.mocked(fetch);
    render(React.createElement(Generate, props));

    fireEvent.click(screen.getByRole("button", { name: /story \/ reel/i }));
    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByLabelText(/creative brief/i), {
      target: { value: "Vertical reel for spring launch" },
    });

    const generate = await screen.findByRole("button", { name: /generate images/i });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);

    await waitFor(() => expect(push).toHaveBeenCalled());
    const createCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/api/generations"));
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      outputs: expect.objectContaining({ formats: ["instagram_story"] }),
    });
  });

  it("unchecking promotion toggle clears campaign fields from payload", async () => {
    const fetchMock = vi.mocked(fetch);
    render(React.createElement(Generate, props));

    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByLabelText(/creative brief/i), {
      target: { value: "Launch image" },
    });

    // enable promotion, fill title
    fireEvent.click(screen.getByLabelText(/enable promotion/i));
    fireEvent.change(screen.getByLabelText(/campaign title/i), {
      target: { value: "Summer sale" },
    });

    // uncheck — should clear and hide fields
    fireEvent.click(screen.getByLabelText(/enable promotion/i));
    expect(screen.queryByLabelText(/campaign title/i)).not.toBeInTheDocument();

    const generate = await screen.findByRole("button", { name: /generate images/i });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);

    await waitFor(() => expect(push).toHaveBeenCalled());
    const createCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/api/generations"));
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<string, unknown>;
    const campaign = body.campaign as Record<string, unknown>;
    expect(campaign.title).toBeFalsy();
  });
});
