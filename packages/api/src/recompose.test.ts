import { describe, expect, it, vi, beforeEach } from "vitest";
import sharp from "sharp";

// We mock @vyora/db so the service doesn't open a real connection. The
// returned `getVariantWithBackground` is configurable per test via
// `mockGetVariant.mockResolvedValueOnce(...)`.
const mockGetVariant = vi.fn();
const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn(async () => undefined),
};
vi.mock("@vyora/db", () => ({
  createDb: vi.fn(() => ({
    update: vi.fn(() => mockUpdateChain),
  })),
  eq: vi.fn(),
  generationVariants: { id: { name: "id" } },
  getVariantWithBackground: (...a: unknown[]) => mockGetVariant(...a),
}));

import { RecomposeService } from "./recompose";

async function makeBackground(width = 1024, height = 1024): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toBuffer();
}

function makeService(storage: {
  getBytes: ReturnType<typeof vi.fn>;
  putBytes: ReturnType<typeof vi.fn>;
  getSignedUrl: ReturnType<typeof vi.fn>;
}) {
  const config = { db: { url: "postgres://nope" } } as never;
  return new RecomposeService(config, storage as never);
}

const variantHappy = {
  id: "v1",
  generationId: "g1",
  workspaceId: "ws1",
  status: "completed",
  outputS3Key: "ws1/v1/output.png",
  backgroundS3Key: "ws1/v1/bg.png",
  cropRegion: null,
  recomposedAt: null,
};

beforeEach(() => {
  mockGetVariant.mockReset();
  mockUpdateChain.set.mockClear();
  mockUpdateChain.where.mockClear();
});

describe("RecomposeService.recomposeVariant", () => {
  it("happy path: extracts the right pixel box and resizes to target", async () => {
    const bg = await makeBackground(1024, 1024);
    const storage = {
      getBytes: vi.fn(async () => bg),
      putBytes: vi.fn(async () => undefined),
      getSignedUrl: vi.fn(async () => "https://signed/x"),
    };
    mockGetVariant.mockResolvedValueOnce(variantHappy);

    const r = await makeService(storage).recomposeVariant({
      workspaceId: "ws1",
      generationId: "g1",
      variantId: "v1",
      // 50% wide × 50% tall centered crop, square target.
      input: { crop: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, targetWidth: 512, targetHeight: 512 },
    });

    expect(r.width).toBe(512);
    expect(r.height).toBe(512);
    expect(r.outputS3Key).toBe(variantHappy.outputS3Key);
    expect(storage.putBytes).toHaveBeenCalledOnce();

    // Inspect the bytes we wrote — they should decode to a 512×512 PNG.
    const calls = storage.putBytes.mock.calls;
    const written = (calls[0] as unknown[])[1] as Buffer;
    const meta = await sharp(written).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);

    // crop_region was persisted with the same shape we received plus the
    // target dims, ready for the editor to repopulate.
    expect(mockUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        cropRegion: { x: 0.25, y: 0.25, w: 0.5, h: 0.5, targetWidth: 512, targetHeight: 512 },
      }),
    );
  });

  it("rejects when crop+target aspect ratios disagree by >1%", async () => {
    const bg = await makeBackground(1024, 1024);
    const storage = {
      getBytes: vi.fn(async () => bg),
      putBytes: vi.fn(),
      getSignedUrl: vi.fn(),
    };
    mockGetVariant.mockResolvedValueOnce(variantHappy);

    await expect(
      makeService(storage).recomposeVariant({
        workspaceId: "ws1",
        generationId: "g1",
        variantId: "v1",
        // Square crop, landscape target — 100% aspect mismatch.
        input: { crop: { x: 0, y: 0, w: 0.5, h: 0.5 }, targetWidth: 1280, targetHeight: 720 },
      }),
    ).rejects.toMatchObject({ httpStatus: 422, userMessage: "aspect_mismatch" });
    expect(storage.putBytes).not.toHaveBeenCalled();
  });

  it("rejects 422 invalid_crop_region for out-of-bounds crop", async () => {
    const storage = {
      getBytes: vi.fn(),
      putBytes: vi.fn(),
      getSignedUrl: vi.fn(),
    };
    await expect(
      makeService(storage).recomposeVariant({
        workspaceId: "ws1",
        generationId: "g1",
        variantId: "v1",
        // 0.6 + 0.6 = 1.2 — outside [0,1].
        input: { crop: { x: 0.6, y: 0.1, w: 0.6, h: 0.5 }, targetWidth: 512, targetHeight: 512 },
      }),
    ).rejects.toMatchObject({ httpStatus: 422, userMessage: "invalid_crop_region" });
  });

  it("returns 404 when the variant doesn't exist", async () => {
    mockGetVariant.mockResolvedValueOnce(null);
    const storage = { getBytes: vi.fn(), putBytes: vi.fn(), getSignedUrl: vi.fn() };
    await expect(
      makeService(storage).recomposeVariant({
        workspaceId: "ws1",
        generationId: "g1",
        variantId: "missing",
        input: { crop: { x: 0, y: 0, w: 1, h: 1 }, targetWidth: 1024, targetHeight: 1024 },
      }),
    ).rejects.toMatchObject({ httpStatus: 404 });
  });

  it("rejects legacy variants that have no background_s3_key", async () => {
    mockGetVariant.mockResolvedValueOnce({ ...variantHappy, backgroundS3Key: null });
    const storage = { getBytes: vi.fn(), putBytes: vi.fn(), getSignedUrl: vi.fn() };
    await expect(
      makeService(storage).recomposeVariant({
        workspaceId: "ws1",
        generationId: "g1",
        variantId: "v1",
        input: { crop: { x: 0, y: 0, w: 1, h: 1 }, targetWidth: 1024, targetHeight: 1024 },
      }),
    ).rejects.toMatchObject({ httpStatus: 422, userMessage: "variant_has_no_background" });
  });

  it("rejects cross-workspace recompose attempts", async () => {
    mockGetVariant.mockResolvedValueOnce(variantHappy);
    const storage = { getBytes: vi.fn(), putBytes: vi.fn(), getSignedUrl: vi.fn() };
    await expect(
      makeService(storage).recomposeVariant({
        workspaceId: "different-ws",
        generationId: "g1",
        variantId: "v1",
        input: { crop: { x: 0, y: 0, w: 1, h: 1 }, targetWidth: 1024, targetHeight: 1024 },
      }),
    ).rejects.toMatchObject({ httpStatus: 403 });
  });

  it("computes exact pixel coords for an asymmetric crop on a 1280×720 source", async () => {
    const bg = await makeBackground(1280, 720);
    const storage = {
      getBytes: vi.fn(async () => bg),
      putBytes: vi.fn(async () => undefined),
      getSignedUrl: vi.fn(async () => "https://signed/x"),
    };
    mockGetVariant.mockResolvedValueOnce(variantHappy);

    // 10% offset from top-left, then 40% × 40% — landscape source so target
    // also needs to be square (40% × 40% of source = 512 × 288 → not square,
    // so target must be 1:1.78). Use a square sub-region for parity.
    await makeService(storage).recomposeVariant({
      workspaceId: "ws1",
      generationId: "g1",
      variantId: "v1",
      // 0.4 wide × 0.4 of 720 = 288; 0.4 of 1280 = 512 — that's 16:9. Match it.
      input: { crop: { x: 0.1, y: 0.1, w: 0.4, h: 0.4 }, targetWidth: 1600, targetHeight: 900 },
    });

    const calls = storage.putBytes.mock.calls;
    const written = (calls[0] as unknown[])[1] as Buffer;
    const meta = await sharp(written).metadata();
    expect(meta.width).toBe(1600);
    expect(meta.height).toBe(900);
  });
});
