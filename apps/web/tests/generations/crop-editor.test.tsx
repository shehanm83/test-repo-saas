import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CropEditor } from "@/components/generations/crop-editor";

// react-image-crop renders an interactive overlay that's hard to drive in
// jsdom (no real layout). The tests focus on the apply flow and the pixel
// payload shape — drag interactions are covered by the integration test.
vi.mock("react-image-crop", () => {
  const Real = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-crop-overlay">{children}</div>
  );
  return {
    __esModule: true,
    default: Real,
  };
});

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

describe("CropEditor", () => {
  it("renders the source image and the lock-to-aspect checkbox", () => {
    render(
      React.createElement(CropEditor, {
        generationId: "g1",
        variantId: "v1",
        backgroundUrl: "https://signed/bg.png",
        targetWidth: 1280,
        targetHeight: 720,
        onApplied: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    expect(screen.getByTestId("react-crop-overlay")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /lock/i })).toBeChecked();
    expect(screen.getByText(/Output: 1280 × 720/)).toBeInTheDocument();
  });

  it("disables Apply until the image has loaded a default crop", () => {
    render(
      React.createElement(CropEditor, {
        generationId: "g1",
        variantId: "v1",
        backgroundUrl: "https://signed/bg.png",
        targetWidth: 1080,
        targetHeight: 1080,
        onApplied: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
  });

  it("posts a normalised crop body and calls onApplied on 200", async () => {
    const onApplied = vi.fn();

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          outputS3Key: "ws/v.png",
          signedUrl: "https://signed/new.png",
          width: 1280,
          height: 720,
          recomposedAt: "2026-05-09T18:00:00Z",
          cropRegion: { x: 0.1, y: 0.1, w: 0.8, h: 0.45, targetWidth: 1280, targetHeight: 720 },
        }),
        { status: 200 },
      ),
    );

    render(
      React.createElement(CropEditor, {
        generationId: "g1",
        variantId: "v1",
        backgroundUrl: "https://signed/bg.png",
        targetWidth: 1280,
        targetHeight: 720,
        // Repopulate with a previously-applied crop so the Apply button is
        // enabled without simulating image-load events.
        initialCrop: { x: 0.1, y: 0.1, w: 0.8, h: 0.45, targetWidth: 1280, targetHeight: 720 },
        onApplied,
        onCancel: vi.fn(),
      }),
    );

    // Trigger the onLoad path by firing on the image element.
    const img = screen.getByAltText(/background/i);
    fireEvent.load(img);

    const applyBtn = screen.getByRole("button", { name: /apply crop/i });
    await waitFor(() => expect(applyBtn).not.toBeDisabled());

    fireEvent.click(applyBtn);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/generations/g1/variants/v1/recompose");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.targetWidth).toBe(1280);
    expect(body.targetHeight).toBe(720);
    expect(body.crop.w).toBeCloseTo(0.8);
    expect(body.crop.h).toBeCloseTo(0.45);

    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
    expect(onApplied.mock.calls[0]![0].signedUrl).toBe("https://signed/new.png");
  });

  it("surfaces an error message when the recompose endpoint returns 422", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "aspect_mismatch" } }), { status: 422 }),
    );

    render(
      React.createElement(CropEditor, {
        generationId: "g1",
        variantId: "v1",
        backgroundUrl: "https://signed/bg.png",
        targetWidth: 1280,
        targetHeight: 720,
        initialCrop: { x: 0, y: 0, w: 1, h: 0.5, targetWidth: 1280, targetHeight: 720 },
        onApplied: vi.fn(),
        onCancel: vi.fn(),
      }),
    );

    fireEvent.load(screen.getByAltText(/background/i));
    fireEvent.click(screen.getByRole("button", { name: /apply crop/i }));
    await waitFor(() => expect(screen.getByText(/aspect_mismatch/)).toBeInTheDocument());
  });
});
