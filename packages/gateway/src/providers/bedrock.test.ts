import { describe, expect, it, vi } from "vitest";
import { BedrockImageProvider } from "./bedrock.js";

vi.mock("@aws-sdk/client-bedrock-runtime", () => {
  const mockSend = vi.fn();
  class BedrockRuntimeClient {
    send = mockSend;
  }
  class InvokeModelCommand {
    constructor(input: unknown) {
      Object.assign(this, input);
    }
  }
  return {
    BedrockRuntimeClient,
    InvokeModelCommand,
    __mockSend: mockSend,
  };
});

describe("BedrockImageProvider", () => {
  it("calls Bedrock SD 3.5 and decodes base64 response", async () => {
    const { __mockSend } = await import("@aws-sdk/client-bedrock-runtime") as unknown as { __mockSend: ReturnType<typeof vi.fn> };
    const fakeB64 = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");
    __mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({ images: [fakeB64] })),
    });

    const p = new BedrockImageProvider({ region: "us-east-1" });
    const r = await p.generate({
      modelCode: "bedrock-sd35",
      prompt: "test",
      aspectRatio: "1:1",
      width: 1024,
      height: 1024,
      safetyLevel: "default",
    });
    expect(r.modelUsedCode).toBe("bedrock-sd35");
    expect(r.imageBytes.byteLength).toBeGreaterThan(0);
    expect(r.upstreamCostCents).toBe(3);
  });

  it("calls Nova Canvas with correct model id", async () => {
    const { __mockSend } = await import("@aws-sdk/client-bedrock-runtime") as unknown as { __mockSend: ReturnType<typeof vi.fn> };
    const fakeB64 = Buffer.from([0x00, 0x01]).toString("base64");
    __mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(JSON.stringify({ images: [fakeB64] })),
    });

    const p = new BedrockImageProvider({ region: "us-east-1" });
    const r = await p.generate({
      modelCode: "nova-canvas",
      prompt: "test",
      aspectRatio: "1:1",
      width: 1024,
      height: 1024,
      safetyLevel: "default",
    });
    expect(r.modelUsedCode).toBe("nova-canvas");
    expect(r.upstreamCostCents).toBe(4);
  });
});
