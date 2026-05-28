import type { Config } from "@layertone/shared/config";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(() => ({})),
  adminInsertStock: vi.fn(async (_db: unknown, value: Record<string, unknown>) => ({
    id: value.id,
    ...value,
  })),
  adminListStock: vi.fn(async () => []),
  deleteStock: vi.fn(async () => undefined),
  putBytes: vi.fn(async () => undefined),
}));

vi.mock("@layertone/db", () => ({
  createDb: mocks.createDb,
  adminInsertStock: mocks.adminInsertStock,
  adminListStock: mocks.adminListStock,
  deleteStock: mocks.deleteStock,
}));

import { StockApi } from "./stock";

const config = { db: { url: "" } } as Config;
const adapters = { storage: { putBytes: mocks.putBytes } } as never;
const api = new StockApi(config, adapters);

describe("StockApi", () => {
  it("uploads an svg asset", async () => {
    const asset = await api.adminUpload({
      kind: "icon",
      category: "food-dietary",
      label: "Arrow Icon",
      tags: ["arrow"],
      license: "internal",
      file: {
        bytes: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>',
          "utf8",
        ),
        mimeType: "image/svg+xml",
        filename: "icon.svg",
      },
    });

    expect(asset.kind).toBe("icon");
    expect(mocks.putBytes).toHaveBeenCalled();
  });
});
