import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import { InspirationUploadApi } from "./inspiration.js";

const storageMock = {
  putBytes: vi.fn(async () => undefined),
  copy: vi.fn(async () => undefined),
  delete: vi.fn(async () => undefined),
};

const adapters = { storage: storageMock } as never;
const config = {} as never;
const api = new InspirationUploadApi(config, adapters);

describe("InspirationUploadApi", () => {
  it("rejects oversized files", async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 1);
    await expect(
      api.create({ workspaceId: "w", userId: "u", file: { bytes: big, filename: "x.png" } }),
    ).rejects.toThrow(/file-too-large/);
  });

  it("rejects non-images (plain text)", async () => {
    const txt = Buffer.from("hello world this is text");
    await expect(
      api.create({ workspaceId: "w", userId: "u", file: { bytes: txt, filename: "x.txt" } }),
    ).rejects.toThrow(/invalid-image-type/);
  });

  it("happy path returns metadata", async () => {
    const png = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    const r = await api.create({
      workspaceId: "w",
      userId: "u",
      file: { bytes: png, filename: "ok.png" },
    });
    expect(r.uploadId).toMatch(/-/);
    expect(r.width).toBe(200);
    expect(r.height).toBe(200);
    expect(storageMock.putBytes).toHaveBeenCalled();
  });

  it("claim copies then deletes staging key", async () => {
    storageMock.copy.mockClear();
    storageMock.delete.mockClear();
    await api.claim({ workspaceId: "w", uploadId: "u1", generationId: "g1" });
    expect(storageMock.copy).toHaveBeenCalledOnce();
    expect(storageMock.delete).toHaveBeenCalledOnce();
  });
});
