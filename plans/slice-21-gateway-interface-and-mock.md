# Slice 21 — AI Gateway interface + mock provider + routing

**Phase:** 6 — AI Gateway
**Depends on:** 05
**Spec references:** [Architecture § 4 (AI gateway)](../specs/2026-04-25-layertone-v1-architecture.md), [decision D15 (i2i routing)](../../../C--personal-saas-img-gen/memory/project_decisions.md).

**Definition of done:**
- `@layertone/gateway` exports a unified `Gateway` class implementing `AIProvider`
- Provider registry: providers register themselves under model codes
- Routing table:
  - `flux-1.1-pro` → Flux provider (i2i: yes)
  - `gpt-image-1` → OpenAI (i2i: yes)
  - `recraft-v3` → Recraft (i2i: yes)
  - `bedrock-sd35`, `nova-canvas` → Bedrock (i2i: limited)
- I2i fallback rule: if `references` includes role=`inspiration` and chosen model has `i2iSupport=false`, route to closest higher-tier i2i model OR call vision-fallback (slice 24)
- Mock provider returns deterministic PNG bytes keyed by `hash(prompt + modelCode + aspectRatio + size)`
- Embedding helpers (`embedText`, `embedImage`) added to interface — used by stock + brand reference embedding

---

## Files

**Create:**
- `packages/gateway/src/{index.ts,types.ts,gateway.ts,routing.ts,mock.ts,gateway.test.ts}`

**Modify:**
- `packages/shared/src/adapters/types.ts` — extend `AIProvider` with `embedText` and `embedImage`
- `packages/shared/src/adapters/factory.ts` — wire gateway

---

## Tasks

- [ ] **Step 1 — Extend `AIProvider` interface**

In `packages/shared/src/adapters/types.ts`, add to `AIProvider`:

```ts
export interface AIProvider {
  // ...existing
  embedText(text: string): Promise<{ vector: number[] }>;
  embedImage(s3Key: string): Promise<{ vector: number[] }>;
}
```

- [ ] **Step 2 — Gateway types**

`packages/gateway/src/types.ts`:

```ts
import type { AIImageRequest, AIImageResponse, AITextRequest, AITextResponse } from "@layertone/shared";

export interface ProviderCapabilities {
  modelCodes: string[];
  supportsImageToImage: boolean;
  supportsMultiReference: boolean;
  tier: "fast" | "premium" | "design" | "fallback";
}

export interface ImageProvider {
  capabilities: ProviderCapabilities;
  generate(req: AIImageRequest): Promise<AIImageResponse>;
}

export interface TextProvider {
  modelCodes: string[];
  generate(req: AITextRequest): Promise<AITextResponse>;
  embed(text: string): Promise<{ vector: number[] }>;
}

export interface VisionProvider {
  describeImageBytes(bytes: Uint8Array): Promise<{ description: string }>;
}

export interface ModerationProvider {
  moderateText(text: string): Promise<{ flagged: boolean; categories: string[] }>;
  moderateImage(bytes: Uint8Array): Promise<{ flagged: boolean; categories: string[] }>;
}
```

- [ ] **Step 3 — Routing**

`packages/gateway/src/routing.ts`:

```ts
import type { ImageProvider } from "./types.js";

export interface RouteResult {
  provider: ImageProvider;
  modelCode: string;
  /** True if we substituted modelCode because the requested one couldn't handle the references. */
  substituted: boolean;
  /** True if no i2i-capable provider available — caller must use vision-fallback path. */
  needsVisionFallback: boolean;
}

export function chooseProvider(
  registry: Map<string, ImageProvider>,
  requestedModel: string,
  hasInspiration: boolean,
): RouteResult {
  const requested = registry.get(requestedModel);
  if (!requested) throw new Error(`unknown model: ${requestedModel}`);

  if (!hasInspiration) {
    return { provider: requested, modelCode: requestedModel, substituted: false, needsVisionFallback: false };
  }

  // Need i2i
  if (requested.capabilities.supportsImageToImage) {
    return { provider: requested, modelCode: requestedModel, substituted: false, needsVisionFallback: false };
  }

  // Promotion: pick a same-or-higher-tier i2i-capable model
  const promotionOrder = ["gpt-image-1", "flux-1.1-pro", "recraft-v3"];
  for (const candidate of promotionOrder) {
    const p = registry.get(candidate);
    if (p?.capabilities.supportsImageToImage) {
      return { provider: p, modelCode: candidate, substituted: true, needsVisionFallback: false };
    }
  }

  // No i2i-capable model — vision fallback
  return { provider: requested, modelCode: requestedModel, substituted: false, needsVisionFallback: true };
}
```

- [ ] **Step 4 — Gateway**

`packages/gateway/src/gateway.ts`:

```ts
import { createHash } from "node:crypto";
import type {
  AIImageRequest, AIImageResponse, AIProvider, AITextRequest, AITextResponse,
} from "@layertone/shared";
import type { ImageProvider, TextProvider, VisionProvider, ModerationProvider } from "./types.js";
import { chooseProvider } from "./routing.js";

export class Gateway implements AIProvider {
  private images = new Map<string, ImageProvider>();
  private text: TextProvider | null = null;
  private vision: VisionProvider | null = null;
  private moderation: ModerationProvider | null = null;

  registerImage(p: ImageProvider): void {
    for (const code of p.capabilities.modelCodes) this.images.set(code, p);
  }
  setText(p: TextProvider): void { this.text = p; }
  setVision(p: VisionProvider): void { this.vision = p; }
  setModeration(p: ModerationProvider): void { this.moderation = p; }

  async generateImage(req: AIImageRequest): Promise<AIImageResponse> {
    const hasInspiration = !!req.references?.some((r) => r.role === "inspiration");
    const route = chooseProvider(this.images, req.modelCode, hasInspiration);

    if (route.needsVisionFallback) {
      // slice 24 fills this in: vision-describe each reference image, splice text into prompt
      const inspiration = req.references!.find((r) => r.role === "inspiration")!;
      if (!this.vision) throw new Error("vision-provider-not-registered");
      // For now, we cannot fetch from S3 here — gateway is provider-only.
      // Caller (worker) is responsible for resolving s3Key→bytes and passing description in.
      throw new Error("vision-fallback-required-but-no-images");
    }

    return route.provider.generate({ ...req, modelCode: route.modelCode });
  }

  async generateText(req: AITextRequest): Promise<AITextResponse> {
    if (!this.text) throw new Error("text-provider-not-registered");
    return this.text.generate(req);
  }

  async describeImage(s3Key: string): Promise<{ description: string }> {
    if (!this.vision) throw new Error("vision-provider-not-registered");
    // Caller resolves S3 to bytes; this signature accepts s3Key only because StorageAdapter is per-app.
    // Real implementation lives in slice 24 with explicit storage injection.
    void s3Key;
    return { description: "(stub)" };
  }

  async moderateText(text: string) {
    if (!this.moderation) return { flagged: false, categories: [] };
    return this.moderation.moderateText(text);
  }
  async moderateImage(bytes: Buffer) {
    if (!this.moderation) return { flagged: false, categories: [] };
    return this.moderation.moderateImage(bytes);
  }

  async embedText(text: string): Promise<{ vector: number[] }> {
    if (!this.text) throw new Error("text-provider-not-registered");
    return this.text.embed(text);
  }
  async embedImage(_s3Key: string): Promise<{ vector: number[] }> {
    // Implemented via vision describe → embed in slice 24
    throw new Error("embedImage not wired until slice 24");
  }
}

/** Stable hash for mock keying. */
export function promptFingerprint(req: AIImageRequest): string {
  return createHash("sha256")
    .update(JSON.stringify({ m: req.modelCode, p: req.prompt, n: req.negativePrompt, a: req.aspectRatio, w: req.width, h: req.height, refs: req.references?.map((r) => r.s3Key + ":" + r.role) ?? [] }))
    .digest("hex").slice(0, 16);
}
```

- [ ] **Step 5 — Mock provider**

`packages/gateway/src/mock.ts`:

```ts
import sharp from "sharp";
import { promptFingerprint } from "./gateway.js";
import type { ImageProvider } from "./types.js";
import type { AIImageRequest, AIImageResponse } from "@layertone/shared";

export class MockImageProvider implements ImageProvider {
  capabilities = {
    modelCodes: ["flux-1.1-pro", "gpt-image-1", "recraft-v3", "bedrock-sd35", "nova-canvas"],
    supportsImageToImage: true,
    supportsMultiReference: true,
    tier: "fast" as const,
  };

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const fp = promptFingerprint(req);
    // Render a deterministic gradient + fingerprint label as a PNG
    const png = await sharp({
      create: {
        width: req.width, height: req.height, channels: 3,
        background: { r: parseInt(fp.slice(0, 2), 16), g: parseInt(fp.slice(2, 4), 16), b: parseInt(fp.slice(4, 6), 16) },
      },
    }).png().toBuffer();

    return {
      imageBytes: png,
      modelUsedCode: req.modelCode,
      upstreamCostCents: 0,
      latencyMs: 5,
      safetyFlags: [],
    };
  }
}
```

(For `TextProvider` mock: similarly returns "(mock text for prompt: <prompt>)" and embed returns `Array(1536).fill(0).map((_, i) => Math.sin(i + hash))`. Add inline.)

- [ ] **Step 6 — Tests**

`packages/gateway/src/gateway.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Gateway } from "./gateway.js";
import { MockImageProvider } from "./mock.js";

describe("Gateway", () => {
  it("routes to registered provider", async () => {
    const gw = new Gateway();
    gw.registerImage(new MockImageProvider());
    const r = await gw.generateImage({
      modelCode: "flux-1.1-pro", prompt: "x", aspectRatio: "1:1", width: 64, height: 64, safetyLevel: "default",
    });
    expect(r.imageBytes.byteLength).toBeGreaterThan(0);
    expect(r.modelUsedCode).toBe("flux-1.1-pro");
  });

  it("throws on unknown model", async () => {
    const gw = new Gateway();
    gw.registerImage(new MockImageProvider());
    await expect(gw.generateImage({
      modelCode: "nope", prompt: "x", aspectRatio: "1:1", width: 64, height: 64, safetyLevel: "default",
    })).rejects.toThrow(/unknown model/);
  });
});
```

- [ ] **Step 7 — Wire mock when AI_MODE=mock in factory**

In `packages/shared/src/adapters/factory.ts`, when `config.ai.mode === "mock"`:

```ts
import { Gateway, MockImageProvider } from "@layertone/gateway";
const gw = new Gateway();
gw.registerImage(new MockImageProvider());
// text/vision/moderation mocks added in slice 24
const ai = gw;
```

- [ ] **Step 8 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(gateway): provider interface, routing with i2i promotion, mock provider"
```

---

## Verification

```bash
pnpm --filter @layertone/gateway test
```

## Commit message

```
feat(gateway): provider interface, routing with i2i promotion, mock provider
```
