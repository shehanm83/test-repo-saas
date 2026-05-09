import { describe, expect, it } from "vitest";

import {
  isKnownTemplate,
  listKnownTemplates,
  renderTemplate,
  UnknownTemplateError,
} from "./templates.js";

describe("renderTemplate", () => {
  it("escapes HTML in interpolated values to prevent injection", () => {
    const out = renderTemplate({
      to: "u@example.com",
      subject: "x",
      template: "workspace.invite",
      data: {
        inviterEmail: "<script>alert(1)</script>",
        workspaceName: "Acme & Co",
        acceptUrl: "https://app.example.com/accept?t=1&u=2",
      },
    });
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
    expect(out.html).toContain("Acme &amp; Co");
    expect(out.html).toContain("https://app.example.com/accept?t=1&amp;u=2");
  });

  it("renders text and html for every registered template", () => {
    const sampleData = {
      inviterEmail: "a@b.com",
      workspaceName: "WS",
      acceptUrl: "u",
      portalUrl: "u",
      packName: "pack",
      amount: "$9",
      credits: 200,
      invoiceUrl: "u",
      firstName: "Sam",
      appUrl: "u",
    };
    for (const name of listKnownTemplates()) {
      const out = renderTemplate({
        to: "x@y.z",
        subject: "s",
        template: name,
        data: sampleData,
      });
      expect(out.html.length).toBeGreaterThan(0);
      expect(out.text.length).toBeGreaterThan(0);
    }
  });

  it("throws UnknownTemplateError for unknown template names", () => {
    expect(() =>
      renderTemplate({ to: "u@e.com", subject: "x", template: "nope", data: {} }),
    ).toThrow(UnknownTemplateError);
  });

  it("isKnownTemplate reflects the registry", () => {
    expect(isKnownTemplate("workspace.invite")).toBe(true);
    expect(isKnownTemplate("nope")).toBe(false);
  });
});
