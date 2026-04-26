import Anthropic from "@anthropic-ai/sdk";
import type { VisionProvider } from "../types.js";

export class AnthropicVisionProvider implements VisionProvider {
  private client: Anthropic;

  constructor(opts: { apiKey: string }) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
  }

  async describeImageBytes(bytes: Uint8Array): Promise<{ description: string }> {
    const r = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: Buffer.from(bytes).toString("base64"),
              },
            },
            {
              type: "text",
              text: "Describe this image's visual style in 2-3 sentences. Focus on: lighting, mood, composition, color palette tendency, subject matter. No proper nouns, no brand names.",
            },
          ],
        },
      ],
    });
    const description = r.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");
    return { description };
  }
}
