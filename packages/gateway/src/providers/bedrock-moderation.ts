import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { ModerationProvider } from "../types";

export class BedrockImageModerationProvider implements ModerationProvider {
  private client: BedrockRuntimeClient;

  constructor(opts: { region: string }) {
    this.client = new BedrockRuntimeClient({ region: opts.region });
  }

  async moderateText(_text: string): Promise<{ flagged: boolean; categories: string[] }> {
    return { flagged: false, categories: [] };
  }

  async moderateImage(bytes: Uint8Array): Promise<{ flagged: boolean; categories: string[] }> {
    const cmd = new InvokeModelCommand({
      modelId: "amazon.titan-content-moderation-v1",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputImage: Buffer.from(bytes).toString("base64") }),
    });
    try {
      const r = await this.client.send(cmd);
      const json = JSON.parse(new TextDecoder().decode(r.body)) as {
        categories?: { name: string; confidence: number }[];
      };
      const flagged = (json.categories ?? []).some((c) => c.confidence > 0.85);
      return { flagged, categories: (json.categories ?? []).map((c) => c.name) };
    } catch {
      return { flagged: false, categories: [] };
    }
  }
}
