import type { ModerationProvider } from "../types";

export class OpenAIModerationProvider implements ModerationProvider {
  constructor(private readonly opts: { apiKey: string }) {}

  async moderateText(text: string): Promise<{ flagged: boolean; categories: string[] }> {
    const r = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
    });
    const out = (await r.json()) as {
      results: { flagged: boolean; categories: Record<string, boolean> }[];
    };
    const res = out.results[0]!;
    return {
      flagged: res.flagged,
      categories: Object.entries(res.categories)
        .filter(([, v]) => v)
        .map(([k]) => k),
    };
  }

  async moderateImage(_bytes: Uint8Array): Promise<{ flagged: boolean; categories: string[] }> {
    return { flagged: false, categories: [] };
  }
}
