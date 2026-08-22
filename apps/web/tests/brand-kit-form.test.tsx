import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BrandKitForm } from "@/components/brands/kit/brand-kit-form";
import type { BrandKitAsset, BrandKitBrand } from "@/components/brands/kit/types";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

const brandId = "11111111-1111-4111-8111-111111111111";

const brand: BrandKitBrand = {
  id: brandId,
  name: "Atlas Coffee",
  sourceUrl: null,
  descriptor: null,
  voiceNotes: null,
  voice: null,
  palette: null,
  fonts: null,
};

const logos: BrandKitAsset[] = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    kind: "logo",
    variant: "lockup",
    background: "any",
    label: "Main lockup",
    isPrimary: true,
    url: null,
    width: 640,
    height: 180,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    kind: "logo",
    variant: "mark",
    background: "dark",
    label: "Dark mark",
    isPrimary: false,
    url: null,
    width: 240,
    height: 240,
  },
];

describe("BrandKitForm", () => {
  beforeEach(() => {
    navigation.push.mockReset();
    navigation.refresh.mockReset();
    window.history.replaceState(null, "", "/brands/new");
    document.querySelectorAll("link[data-brand-font]").forEach((link) => link.remove());
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/brands" && init?.method === "POST") {
          return Response.json({ id: brandId });
        }
        if (url.endsWith("/assets") && (!init?.method || init.method === "GET")) {
          return Response.json(logos);
        }
        return Response.json({});
      }),
    );
  });

  it("creates the row from the name without persisting untouched preview defaults", async () => {
    render(<BrandKitForm />);

    fireEvent.change(screen.getByLabelText("Brand name"), {
      target: { value: "  Atlas Coffee  " },
    });
    fireEvent.blur(screen.getByLabelText("Brand name"));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved"));
    expect(window.location.pathname).toBe(`/brands/${brandId}`);

    const fetchMock = vi.mocked(fetch);
    const create = fetchMock.mock.calls.find(
      ([input, init]) => String(input) === "/api/brands" && init?.method === "POST",
    );
    expect(JSON.parse(create?.[1]?.body as string)).toEqual({ name: "Atlas Coffee" });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);
  });

  it("blocks uploads until the brand has a name", async () => {
    const { container } = render(<BrandKitForm />);
    const input = container.querySelector<HTMLInputElement>('input[accept*="image/svg+xml"]');
    expect(input).not.toBeNull();

    fireEvent.change(input!, {
      target: { files: [new File(["logo"], "logo.png", { type: "image/png" })] },
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Give the brand a name first");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("autosaves only the edited field and normalizes the website URL", async () => {
    render(<BrandKitForm brand={brand} />);

    fireEvent.change(screen.getByLabelText("Website"), { target: { value: "atlas.example" } });
    fireEvent.blur(screen.getByLabelText("Website"));

    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true),
    );
    const patch = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(patch?.[1]?.body as string)).toEqual({
      sourceUrl: "https://atlas.example",
    });
  });

  it("starts with empty font slots and saves once both verified families are selected", async () => {
    render(<BrandKitForm brand={brand} />);

    expect(screen.getAllByText("Choose font")).toHaveLength(2);

    fireEvent.click(screen.getByRole("combobox", { name: "Headline font family" }));
    fireEvent.change(screen.getByLabelText("Search headline fonts"), {
      target: { value: "Pacifico" },
    });
    fireEvent.click(screen.getByRole("option", { name: /Pacifico/i }));

    fireEvent.click(screen.getByRole("combobox", { name: "Body font family" }));
    fireEvent.change(screen.getByLabelText("Search body fonts"), {
      target: { value: "Inter" },
    });
    fireEvent.click(screen.getByRole("option", { name: /Inter/i }));

    await waitFor(
      () =>
        expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true),
      { timeout: 2_000 },
    );
    const patch = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(patch?.[1]?.body as string)).toMatchObject({
      fonts: {
        heading: { family: "Pacifico", weight: "400" },
        body: { family: "Inter", weight: "400" },
      },
    });
  });

  it("optimistically enforces exactly one primary logo and persists the choice", async () => {
    render(<BrandKitForm brand={brand} assets={logos} />);

    fireEvent.click(screen.getByRole("button", { name: "Make primary" }));

    const logoSection = screen.getByRole("heading", { name: "Logos" }).closest("section");
    expect(logoSection).not.toBeNull();
    expect(within(logoSection!).getAllByText("Primary")).toHaveLength(1);
    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true),
    );
    const patch = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(String(patch?.[0])).toContain(`/assets/${logos[1]!.id}`);
    expect(JSON.parse(patch?.[1]?.body as string)).toEqual({ isPrimary: true });
  });

  it("opens a large logo preview and closes it with Escape", () => {
    const logosWithPreview = [{ ...logos[0]!, url: "/atlas-logo.svg" }, logos[1]!];
    render(<BrandKitForm brand={brand} assets={logosWithPreview} />);

    fireEvent.click(screen.getByRole("button", { name: "Magnify Main lockup on light artwork" }));

    expect(screen.getByRole("dialog", { name: "Main lockup preview" })).toBeInTheDocument();
    expect(screen.getByAltText("Main lockup on light artwork")).toBeInTheDocument();
    expect(screen.getByAltText("Main lockup on dark artwork")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Main lockup preview" })).not.toBeInTheDocument();
  });
});
