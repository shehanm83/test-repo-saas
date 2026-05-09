import { describe, expect, it } from "vitest";

import { ConsoleEmailProvider } from "./console.js";

describe("ConsoleEmailProvider", () => {
  it("renders the template, calls the sink, and returns an id", async () => {
    const captured: Array<Record<string, unknown>> = [];
    const provider = new ConsoleEmailProvider({
      from: "studio@example.com",
      sink: (e) => captured.push(e),
    });

    const result = await provider.send({
      to: "user@example.com",
      subject: "Welcome",
      template: "user.welcome",
      data: { firstName: "Sam", workspaceName: "WS", appUrl: "https://app.example.com" },
    });

    expect(result.id).toMatch(/^console-/);
    expect(captured).toHaveLength(1);
    expect(captured[0]!.to).toEqual(["user@example.com"]);
    expect(captured[0]!.subject).toBe("Welcome");
    expect(captured[0]!.from).toBe("studio@example.com");
    expect(String(captured[0]!.text)).toContain("WS");
  });

  it("normalizes a single recipient and an array of recipients to an array", async () => {
    const captured: Array<{ to: string[] }> = [];
    const provider = new ConsoleEmailProvider({
      from: "studio@example.com",
      sink: (e) => captured.push({ to: e.to }),
    });

    await provider.send({
      to: ["a@x.com", "b@x.com"],
      subject: "x",
      template: "user.welcome",
      data: { workspaceName: "W", appUrl: "u" },
    });
    expect(captured[0]!.to).toEqual(["a@x.com", "b@x.com"]);
  });
});
