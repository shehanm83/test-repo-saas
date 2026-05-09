import { describe, expect, it, vi } from "vitest";

import { ResendEmailProvider, ResendError } from "./resend.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("ResendEmailProvider", () => {
  it("posts the right URL/headers/body and returns the id from the response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { id: "abc-123" })) as unknown as typeof fetch;
    const provider = new ResendEmailProvider({
      apiKey: "re_TESTKEY",
      from: "Vyora <studio@example.com>",
      fetchImpl,
    });

    const result = await provider.send({
      to: "user@example.com",
      subject: "Welcome",
      template: "user.welcome",
      data: { workspaceName: "WS", appUrl: "https://app.example.com" },
    });

    expect(result.id).toBe("abc-123");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_TESTKEY");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe("Vyora <studio@example.com>");
    expect(body.to).toBe("user@example.com");
    expect(body.subject).toBe("Welcome");
    expect(body.html).toContain("WS");
    expect(body.text).toContain("WS");
  });

  it("throws ResendError with status and parsed body on 422", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(422, { name: "validation_error", message: "Invalid `to` field" }),
    ) as unknown as typeof fetch;
    const provider = new ResendEmailProvider({ apiKey: "k", from: "f@x", fetchImpl });
    await expect(
      provider.send({ to: "x", subject: "s", template: "user.welcome", data: { workspaceName: "W", appUrl: "u" } }),
    ).rejects.toMatchObject({ status: 422, code: "resend_error" });
  });

  it("throws ResendError on 401 (invalid API key)", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(401, { name: "missing_api_key", message: "API key is invalid" }),
    ) as unknown as typeof fetch;
    const provider = new ResendEmailProvider({ apiKey: "bad", from: "f@x", fetchImpl });
    await expect(
      provider.send({ to: "x", subject: "s", template: "user.welcome", data: { workspaceName: "W", appUrl: "u" } }),
    ).rejects.toBeInstanceOf(ResendError);
  });
});
