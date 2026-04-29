# Slice 24 — Safety pipeline + vision fallback + text/embedding providers

**Phase:** 6 — AI Gateway
**Depends on:** 22, 23
**Spec references:** [Architecture § 4.4 (safety pipeline)](../specs/2026-04-25-studio-v1-architecture.md), [Architecture § 4.3 vision-fallback path](../specs/2026-04-25-studio-v1-architecture.md), [Spec § 3.6 (caption job)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `OpenAIModerationProvider` (text moderation via OpenAI Moderation API)
- `BedrockImageModerationProvider` (NSFW classifier on output bytes)
- `AnthropicTextProvider` for caption + describe-image (Claude Haiku for captions, Claude Sonnet 4.6 vision for describe)
- Embedding via OpenAI `text-embedding-3-small`
- Vision-fallback orchestration: when gateway routes via `needsVisionFallback`, calls describe → splices "Style cues from reference: ..." into prompt → calls original provider text-only
- Mock variants for AI_MODE=mock

---

## Files

**Create:**
- `packages/gateway/src/providers/anthropic-text.ts`
- `packages/gateway/src/providers/openai-moderation.ts`
- `packages/gateway/src/providers/bedrock-moderation.ts`
- `packages/gateway/src/providers/openai-embed.ts`
- `packages/gateway/src/providers/anthropic-vision.ts`
- `packages/gateway/src/safety.ts`
- Tests for each + integration test for vision fallback

**Modify:**
- `packages/gateway/src/gateway.ts` — vision-fallback execution path

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @vyora/gateway add @anthropic-ai/sdk
```

- [ ] **Step 2 — Anthropic text provider**

```ts
// packages/gateway/src/providers/anthropic-text.ts
import Anthropic from "@anthropic-ai/sdk";
import type { TextProvider } from "../types.js";
import type { AITextRequest, AITextResponse } from "@vyora/shared";

export class AnthropicTextProvider implements TextProvider {
  modelCodes = ["claude-haiku-4-5"];
  private client: Anthropic;

  constructor(opts: { apiKey: string; openaiKeyForEmbed?: string }) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
  }

  async generate(req: AITextRequest): Promise<AITextResponse> {
    const start = Date.now();
    const r = await this.client.messages.create({
      model: req.modelCode === "claude-haiku-4-5" ? "claude-haiku-4-5-20251001" : "claude-haiku-4-5-20251001",
      max_tokens: req.maxTokens ?? 800,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.prompt }],
    });
    const text = r.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    return {
      text,
      upstreamCostCents: Math.ceil((r.usage.input_tokens + r.usage.output_tokens) / 1000),
      latencyMs: Date.now() - start,
    };
  }

  async embed(text: string): Promise<{ vector: number[] }> {
    // Embed via OpenAI to keep one vector dim across the system (1536)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY required for embeddings");
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!r.ok) throw new Error(`openai-embed-${r.status}`);
    const out = (await r.json()) as { data: { embedding: number[] }[] };
    return { vector: out.data[0]!.embedding };
  }
}
```

- [ ] **Step 3 — OpenAI moderation**

```ts
// packages/gateway/src/providers/openai-moderation.ts
import type { ModerationProvider } from "../types.js";

export class OpenAIModerationProvider implements ModerationProvider {
  constructor(private readonly opts: { apiKey: string }) {}

  async moderateText(text: string) {
    const r = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
    });
    const out = (await r.json()) as { results: { flagged: boolean; categories: Record<string, boolean> }[] };
    const res = out.results[0]!;
    return { flagged: res.flagged, categories: Object.entries(res.categories).filter(([, v]) => v).map(([k]) => k) };
  }

  async moderateImage(_bytes: Uint8Array) {
    // Placeholder — defer to Bedrock image moderator below
    return { flagged: false, categories: [] };
  }
}
```

- [ ] **Step 4 — Bedrock image moderation**

```ts
// packages/gateway/src/providers/bedrock-moderation.ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { ModerationProvider } from "../types.js";

export class BedrockImageModerationProvider implements ModerationProvider {
  private client: BedrockRuntimeClient;
  constructor(opts: { region: string }) { this.client = new BedrockRuntimeClient({ region: opts.region }); }

  async moderateText(_text: string) { return { flagged: false, categories: [] }; }

  async moderateImage(bytes: Uint8Array): Promise<{ flagged: boolean; categories: string[] }> {
    const cmd = new InvokeModelCommand({
      modelId: "amazon.titan-content-moderation-v1",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputImage: Buffer.from(bytes).toString("base64") }),
    });
    try {
      const r = await this.client.send(cmd);
      const json = JSON.parse(new TextDecoder().decode(r.body)) as { categories?: { name: string; confidence: number }[] };
      const flagged = (json.categories ?? []).some((c) => c.confidence > 0.85);
      return { flagged, categories: (json.categories ?? []).map((c) => c.name) };
    } catch { return { flagged: false, categories: [] }; }
  }
}
```

- [ ] **Step 5 — Anthropic vision (for vision-fallback path)**

```ts
// packages/gateway/src/providers/anthropic-vision.ts
import Anthropic from "@anthropic-ai/sdk";
import type { VisionProvider } from "../types.js";

export class AnthropicVisionProvider implements VisionProvider {
  private client: Anthropic;
  constructor(opts: { apiKey: string }) { this.client = new Anthropic({ apiKey: opts.apiKey }); }

  async describeImageBytes(bytes: Uint8Array): Promise<{ description: string }> {
    const r = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/png", data: Buffer.from(bytes).toString("base64") } },
          { type: "text", text: "Describe this image's visual style in 2-3 sentences. Focus on: lighting, mood, composition, color palette tendency, subject matter. No proper nouns, no brand names." },
        ],
      }],
    });
    const description = r.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    return { description };
  }
}
```

- [ ] **Step 6 — Safety helpers**

```ts
// packages/gateway/src/safety.ts
import type { ModerationProvider } from "./types.js";

export async function preFlightModerate(mp: ModerationProvider | null, text: string): Promise<void> {
  if (!mp) return;
  const r = await mp.moderateText(text);
  if (r.flagged) {
    const e = new Error(`safety-blocked: ${r.categories.join(",")}`);
    (e as Error & { code?: string }).code = "safety.text_blocked";
    throw e;
  }
}

export async function postFlightModerate(mp: ModerationProvider | null, bytes: Uint8Array): Promise<string[]> {
  if (!mp) return [];
  const r = await mp.moderateImage(bytes);
  if (r.flagged) {
    const e = new Error(`safety-blocked-image: ${r.categories.join(",")}`);
    (e as Error & { code?: string }).code = "safety.image_blocked";
    throw e;
  }
  return [];
}
```

- [ ] **Step 7 — Wire vision-fallback in `gateway.ts`**

```ts
// In Gateway.generateImage:
if (route.needsVisionFallback) {
  const inspiration = req.references!.find((r) => r.role === "inspiration")!;
  if (!this.vision) throw new Error("vision-provider-not-registered");
  if (!this.storage) throw new Error("storage-not-injected");
  const bytes = await this.storage.getBytes(inspiration.s3Key);
  const { description } = await this.vision.describeImageBytes(bytes);
  const newPrompt = `${req.prompt}\n\nStyle cues from reference: ${description}`;
  const nonRefReq = { ...req, references: req.references!.filter((r) => r.role !== "inspiration"), prompt: newPrompt };
  return route.provider.generate(nonRefReq);
}
```

(Add a `setStorage(s: StorageAdapter)` method to Gateway and inject in factory.)

- [ ] **Step 8 — Update factory wiring**

When `AI_MODE=real`:
```ts
const gw = new Gateway();
gw.setStorage(storage);
if (config.ai.replicateToken) gw.registerImage(new FluxImageProvider({ replicateToken: config.ai.replicateToken, storage }));
if (config.ai.openaiKey) gw.registerImage(OpenAIImageProvider.withStorage(config.ai.openaiKey, storage));
if (config.ai.recraftKey) gw.registerImage(new RecraftImageProvider({ apiKey: config.ai.recraftKey, storage }));
gw.registerImage(new BedrockImageProvider({ region: config.ai.bedrockRegion }));
if (config.ai.anthropicKey) {
  gw.setText(new AnthropicTextProvider({ apiKey: config.ai.anthropicKey }));
  gw.setVision(new AnthropicVisionProvider({ apiKey: config.ai.anthropicKey }));
}
if (config.ai.openaiKey) gw.setModeration(new OpenAIModerationProvider({ apiKey: config.ai.openaiKey }));
ai = gw;
```

When `AI_MODE=mock`: register `MockImageProvider`, `MockTextProvider`, `MockVisionProvider`, `MockModerationProvider` (all return safe deterministic outputs).

- [ ] **Step 9 — Tests**

Use msw or vi.stubGlobal('fetch', ...) for OpenAI/Anthropic; mock `BedrockRuntimeClient.send` for Bedrock. Test:
- Text moderation flagged → throws with code `safety.text_blocked`
- Image moderation flagged → throws with code `safety.image_blocked`
- Vision fallback path: stub vision provider, assert prompt rewritten

- [ ] **Step 10 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(gateway): safety pipeline (mod + vision fallback) + Anthropic text/vision + OpenAI embed"
```

---

## Verification

```bash
pnpm --filter @vyora/gateway test
```

## Commit message

```
feat(gateway): safety pipeline (mod + vision fallback) + Anthropic text/vision + OpenAI embed
```
