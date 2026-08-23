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
const logoAssetId = "66666666-6666-4666-8666-666666666666";
const secondLogoAssetId = "77777777-7777-4777-8777-777777777777";

const props = {
  brands: [
    {
      id: brandId,
      name: "Test Brand",
      palette: ["#101828", "#1F7A5A"],
      logoAssets: [
        {
          id: logoAssetId,
          url: "https://example.com/logo-1.png",
          mimeType: "image/png",
          width: 320,
          height: 120,
        },
        {
          id: secondLogoAssetId,
          url: "https://example.com/logo-2.png",
          mimeType: "image/png",
          width: 240,
          height: 240,
        },
      ],
    },
  ],
  moods: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Editorial",
      kind: "Evergreen",
      group: "always" as const,
    },
  ],
  products: [
    {
      id: productId,
      brandId,
      name: "Serum",
      title: "Glow serum",
      priceMinor: 2900,
      currency: "USD",
    },
  ],
  credits: 100,
};

describe("commercial generation page", () => {
  beforeEach(() => {
    push.mockReset();
    // Keep every Quick Create case on a clean URL and browser state.
    window.history.replaceState(null, "", "/generate");
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
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
            estimate: {
              credits: 20,
              balance: 100,
              lineItems: [{ label: "2 standard variants", credits: 20 }],
            },
          });
        }
        if (url.endsWith("/api/generations/prompt-preview")) {
          return Response.json({
            mode: "quick",
            templateId: "quick.product_only",
            templateVersion: 1,
            templatePath: "quick.product_only",
            prompt:
              "Create a commercial product image for instagram post.\n\nUser direction:\nCreate a clean launch image",
            negativePrompt: "fake logo, unreadable text",
            overlaySlots: {},
            modelInstructions: {
              compatibleModels: ["gpt-image-1"],
              safetyRules: ["Do not generate readable promotional text."],
            },
            outputTarget: {
              kind: "social",
              platform: "instagram",
              format: "post",
              aspectRatio: "1:1",
              width: 1080,
              height: 1080,
            },
            generationTemplate: {
              id: "99999999-9999-4999-8999-999999999999",
              slug: "quick-create-image-only",
              name: "Quick Create",
              preferredModel: "gpt-image-1",
              hasTextSafeZones: false,
            },
          });
        }
        if (url.endsWith("/api/generations")) {
          return Response.json({ generationId: "44444444-4444-4444-8444-444444444444" });
        }
        if (url.endsWith("/api/products")) {
          return Response.json({ id: "55555555-5555-4555-8555-555555555555" });
        }
        return Response.json({});
      }),
    );
  });

  it("renders Quick Create as the only generation workflow", () => {
    render(React.createElement(Generate, props));

    expect(screen.getByRole("heading", { name: "Quick Create" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Campaign Builder" })).not.toBeInTheDocument();
    expect(screen.queryByText("Step 1 of 8")).not.toBeInTheDocument();
  });

  it("allows the minimum quick flow without brand, mood, or product", async () => {
    render(React.createElement(Generate, { ...props, products: [] }));

    const generate = screen.getByRole("button", { name: /generate images/i });
    expect(generate).toBeDisabled();
    expect(screen.getByText("Not selected")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /creative brief/i }), {
      target: { value: "Create a clean campaign image" },
    });

    await waitFor(() => expect(generate).toBeEnabled());
  });

  it("keeps brand asset controls disabled until a brand is selected", () => {
    render(React.createElement(Generate, props));

    expect(screen.getByRole("button", { name: /use brand colors/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /use brand logo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /use brand fonts/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/select brand/i), { target: { value: brandId } });

    expect(screen.getByRole("button", { name: /use brand colors/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /use brand logo/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /use brand fonts/i })).toBeEnabled();
  });

  it("lets quick create select one or more brand logos for generation", async () => {
    const fetchMock = vi.mocked(fetch);
    render(React.createElement(Generate, props));

    fireEvent.change(screen.getByLabelText(/select brand/i), { target: { value: brandId } });
    fireEvent.click(screen.getByRole("button", { name: /use brand logo/i }));

    expect(screen.getByText(/select logos to use/i)).toBeInTheDocument();
    const logoButtons = screen.getAllByRole("button", { name: /select logo/i });
    fireEvent.click(logoButtons[0]!);
    fireEvent.click(logoButtons[1]!);

    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /creative brief/i }), {
      target: { value: "Create a clean launch image with selected logos" },
    });

    const generate = await screen.findByRole("button", { name: /generate images/i });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);

    expect(
      await screen.findByRole("dialog", { name: /prompt sent to image model/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start generation/i }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/generations"),
    );
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<
      string,
      unknown
    >;
    expect(body.brandLogoAssetIds).toEqual([logoAssetId, secondLogoAssetId]);
  });

  it("does not show mood reference images until a mood with a real preview is selected", () => {
    render(React.createElement(Generate, props));

    expect(screen.queryByText(/mood references/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/editorial references/i)).not.toBeInTheDocument();
  });

  it("renders server preflight warnings in the review rail", async () => {
    render(React.createElement(Generate, props));

    fireEvent.change(screen.getByLabelText(/select brand/i), { target: { value: brandId } });
    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /creative brief/i }), {
      target: { value: "Create a clean launch image" },
    });

    expect(
      await screen.findByText("Add a CTA so the ad has a clear commercial action."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("20").length).toBeGreaterThan(0);
  });

  it("submits the normalized commercial payload", async () => {
    const fetchMock = vi.mocked(fetch);
    render(React.createElement(Generate, props));

    fireEvent.change(screen.getByLabelText(/select brand/i), { target: { value: brandId } });
    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /creative brief/i }), {
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

    expect(await screen.findByText(/prompt sent to image model/i)).toBeInTheDocument();
    expect(screen.getByText(/create a commercial product image/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start generation/i }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/generations/44444444-4444-4444-8444-444444444444"),
    );
    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/generations"),
    );
    expect(createCall).toBeTruthy();
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      mode: "quick",
      creationType: "single_product",
      brandId,
      brief: "Create a clean launch image",
      campaign: { cta: "Shop now" },
      outputs: { variants: 2, quality: "standard", formats: ["instagram_square"] },
    });
    expect(body.productRefs).toEqual([expect.objectContaining({ productId, role: "hero" })]);
  });

  it("selecting Story/Reel sets instagram_story format in the payload", async () => {
    const fetchMock = vi.mocked(fetch);
    render(React.createElement(Generate, props));

    fireEvent.change(screen.getByLabelText(/select brand/i), { target: { value: brandId } });
    fireEvent.click(screen.getByRole("button", { name: /story.*9:16/i }));
    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /creative brief/i }), {
      target: { value: "Vertical reel for spring launch" },
    });

    const generate = await screen.findByRole("button", { name: /generate images/i });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);

    expect(
      await screen.findByRole("dialog", { name: /prompt sent to image model/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start generation/i }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/generations"),
    );
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      outputs: expect.objectContaining({ formats: ["instagram_story"] }),
    });
  });

  it("uses a real TikTok format and removes unsupported quick social platforms", async () => {
    const fetchMock = vi.mocked(fetch);
    render(React.createElement(Generate, props));

    expect(screen.queryByRole("button", { name: /pinterest/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /youtube/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /x \/ twitter/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tiktok/i }));
    fireEvent.click(screen.getByRole("button", { name: /vertical.*9:16/i }));
    fireEvent.change(screen.getByLabelText(/select brand/i), { target: { value: brandId } });
    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /creative brief/i }), {
      target: { value: "TikTok launch creative" },
    });

    const generate = await screen.findByRole("button", { name: /generate images/i });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);

    expect(
      await screen.findByRole("dialog", { name: /prompt sent to image model/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start generation/i }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/generations"),
    );
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      outputs: expect.objectContaining({ formats: ["tiktok_vertical"] }),
    });
  });

  it("unchecking promotion toggle clears campaign fields from payload", async () => {
    const fetchMock = vi.mocked(fetch);
    render(React.createElement(Generate, props));

    fireEvent.change(screen.getByLabelText(/select brand/i), { target: { value: brandId } });
    fireEvent.click(screen.getByRole("button", { name: /glow serum/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /creative brief/i }), {
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

    expect(
      await screen.findByRole("dialog", { name: /prompt sent to image model/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start generation/i }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/generations"),
    );
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<
      string,
      unknown
    >;
    const campaign = body.campaign as Record<string, unknown>;
    expect(campaign.title).toBeUndefined();
  });
});
