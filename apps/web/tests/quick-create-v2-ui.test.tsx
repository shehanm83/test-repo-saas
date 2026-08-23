import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Generate } from "@/components/generate/generate";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const brandId = "11111111-1111-4111-8111-111111111111";
const productId = "22222222-2222-4222-8222-222222222222";
const moodId = "33333333-3333-4333-8333-333333333333";
const visualUploadId = "55555555-5555-4555-8555-555555555555";

const plan = {
  version: 1 as const,
  facts: {
    request: "Launch the serum",
    products: [],
    claims: [],
    exactCopy: {},
    explicitConstraints: [],
  },
  suggestions: {
    subject: "Serum",
    scene: "Studio",
    action: "Hero pose",
    audience: "Customers",
    visualStyle: "Editorial",
    composition: "Format aware",
    copyIntent: "No copy",
    constraints: [],
  },
  clarification: null,
  moodRecommendations: [
    {
      moodId,
      reason: "Editorial lighting supports the premium launch.",
      confidence: 0.82,
    },
  ],
  variants: [
    {
      version: 1 as const,
      index: 0,
      label: "Clean studio hero",
      concept: "A precise studio launch image",
      composition: "Centered with negative space",
      camera: "Eye level",
      lighting: "Soft directional light",
      artDirection: "Minimal premium editorial",
      seed: 123,
      locks: { identity: true, claims: true, exactCopy: true, brand: true, mood: false },
      moodRecipe: null,
    },
    {
      version: 1 as const,
      index: 1,
      label: "Warm lifestyle moment",
      concept: "A tactile morning launch moment",
      composition: "Off-center environmental composition",
      camera: "Natural three-quarter view",
      lighting: "Warm window light",
      artDirection: "Credible lifestyle photography",
      seed: 456,
      locks: { identity: true, claims: true, exactCopy: true, brand: true, mood: false },
      moodRecipe: null,
    },
  ],
};

const props = {
  quickCreateV2: true,
  brands: [{ id: brandId, name: "Test Brand", palette: ["#111111", "#eeeeee"] }],
  moods: [
    {
      id: moodId,
      name: "Editorial",
      kind: "evergreen",
      group: "always" as const,
      supportedAspectRatios: ["1:1", "4:5"],
      entitled: true,
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
  planSegment: "subscription" as const,
};

describe("Quick Create V2 composer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/generate");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:visual-reference"),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/generations/preflight")) {
          return Response.json({
            blocking: [],
            warnings: [],
            estimate: { credits: 20, balance: 100, lineItems: [] },
          });
        }
        if (url.endsWith("/api/quick-create/plan")) return Response.json(plan);
        if (url.endsWith("/api/uploads/inspiration")) {
          return Response.json({ uploadId: visualUploadId });
        }
        if (url.endsWith("/api/generations")) {
          return Response.json({
            generationId: "44444444-4444-4444-8444-444444444444",
            status: "completed",
            variants: plan.variants.map((variant) => ({
              id: `variant-${variant.index}`,
              status: "completed",
              url: `https://example.com/result-${variant.index}.png`,
            })),
          });
        }
        return Response.json({});
      }),
    );
  });

  it("uses the intent-first surface and explicitly selects the sole brand", () => {
    render(<Generate {...props} />);

    expect(screen.getByRole("heading", { name: "Start with the idea." })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /what do you want to create/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Test Brand").length).toBeGreaterThan(0);
    expect(screen.queryByText("Editorial")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /explore moods/i })).toBeInTheDocument();
    expect(screen.getByText("Advanced controls").closest("details")).toHaveAttribute("open");
    expect(screen.queryByText("Campaign details")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate images/i })).not.toBeInTheDocument();
  });

  it("plans before credits and generates results inline without the prompt modal", async () => {
    const fetchMock = vi.mocked(fetch);
    render(<Generate {...props} />);

    fireEvent.change(screen.getByRole("textbox", { name: /what do you want to create/i }), {
      target: { value: "Launch the serum in a precise studio scene" },
    });
    const planButton = screen.getByRole("button", { name: /plan directions/i });
    await waitFor(() => expect(planButton).toBeEnabled());
    fireEvent.click(planButton);

    expect(await screen.findByText("Clean studio hero")).toBeInTheDocument();
    expect(screen.getByText("Warm lifestyle moment")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /generate 2/i }));
    expect(await screen.findByRole("heading", { name: "Your images" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /generated variant/i })).toHaveLength(2);

    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/generations"),
    );
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      brandId,
      inspirationInfluence: "balanced",
      creativePlan: { version: 1 },
    });
  });

  it("shows catalog moods to free users with a clear entitlement lock", () => {
    render(
      <Generate
        {...props}
        planSegment="free"
        moods={props.moods.map((mood) => ({ ...mood, entitled: false }))}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /explore moods/i }));
    expect(screen.getByRole("dialog", { name: /choose a visual direction/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editorialupgrade to use/i })).toBeDisabled();
  });

  it("requires explicit acceptance before applying an AI-recommended mood", async () => {
    render(<Generate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /ai suggested/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /what do you want to create/i }), {
      target: { value: "Premium serum launch" },
    });
    const planButton = screen.getByRole("button", { name: /plan directions/i });
    await waitFor(() => expect(planButton).toBeEnabled());
    fireEvent.click(planButton);

    const useMood = await screen.findByRole("button", { name: "Use mood" });
    fireEvent.click(useMood);
    expect(screen.getAllByText("Editorial").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /plan directions/i })).toBeInTheDocument();
  });

  it("submits composer attachments as visual references rather than products", async () => {
    const fetchMock = vi.mocked(fetch);
    render(<Generate {...props} />);
    const file = new File(["reference"], "lighting-reference.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText("Visual reference image files"), {
      target: { files: [file] },
    });
    expect(await screen.findByText("lighting-reference")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("1/2 references")).toBeInTheDocument());

    fireEvent.change(screen.getByRole("textbox", { name: /what do you want to create/i }), {
      target: { value: "Use the attached lighting and composition" },
    });
    const planButton = screen.getByRole("button", { name: /plan directions/i });
    await waitFor(() => expect(planButton).toBeEnabled());
    fireEvent.click(planButton);
    await screen.findByText("Clean studio hero");
    fireEvent.click(screen.getByRole("button", { name: /generate 2/i }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) => String(input).endsWith("/api/generations")),
      ).toBe(true),
    );
    const planCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/quick-create/plan"),
    );
    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/api/generations"),
    );
    const planBody = JSON.parse((planCall?.[1] as RequestInit).body as string) as {
      attachmentUploadIds: string[];
    };
    const createBody = JSON.parse((createCall?.[1] as RequestInit).body as string) as {
      inspirationUploadIds: string[];
      productRefs: unknown[];
    };
    expect(planBody.attachmentUploadIds).toEqual([visualUploadId]);
    expect(createBody.inspirationUploadIds).toEqual([visualUploadId]);
    expect(createBody.productRefs).toEqual([]);
  });

  it("closes Brand, Product, and Format popovers when clicking outside", async () => {
    render(<Generate {...props} />);

    for (const label of ["Brand", "Product", "Format"]) {
      const details = screen.getByText(label).closest("details")!;
      fireEvent.click(details.querySelector("summary")!);
      expect(details).toHaveAttribute("open");
      fireEvent.pointerDown(document.body);
      await waitFor(() => expect(details).not.toHaveAttribute("open"));
    }
  });
});
