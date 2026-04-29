import type { Config } from "@vyora/shared/config";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(() => ({})),
  adminListTemplates: vi.fn(async () => []),
  adminCreateTemplate: vi.fn(async (_db: unknown, value: Record<string, unknown>) => ({
    id: "t1",
    ...value,
  })),
  adminUpdateTemplate: vi.fn(async () => ({ id: "t1" })),
  listPublishedTemplatesForRouting: vi.fn(async () => []),
}));

vi.mock("@vyora/db", () => ({
  createDb: mocks.createDb,
  adminListTemplates: mocks.adminListTemplates,
  adminCreateTemplate: mocks.adminCreateTemplate,
  adminUpdateTemplate: mocks.adminUpdateTemplate,
  listPublishedTemplatesForRouting: mocks.listPublishedTemplatesForRouting,
}));

import { TemplateApi } from "./template";

const api = new TemplateApi({ db: { url: "" } } as Config);

describe("TemplateApi", () => {
  it("rejects bad model code", async () => {
    await expect(
      api.adminCreate({
        slug: "x",
        name: "X",
        jsxSource: "<svg>...</svg>",
        slots: {},
        textSafeZones: [],
        preferredModel: "nonexistent",
        supportedAspectRatios: ["1:1"],
      }),
    ).rejects.toThrow();
  });

  it("creates a valid template", async () => {
    const template = await api.adminCreate({
      slug: "minimal-square",
      name: "Minimal Square",
      jsxSource: "<svg>........</svg>",
      slots: { logo: { placement: { x: 0, y: 0, w: 0.2, h: 0.2 }, maxWidth: 0.2 } },
      textSafeZones: [{ x: 0, y: 0, w: 1, h: 0.3 }],
      preferredModel: "flux-1.1-pro",
      supportedAspectRatios: ["1:1", "4:5"],
    });

    expect(template.slug).toBe("minimal-square");
  });
});
