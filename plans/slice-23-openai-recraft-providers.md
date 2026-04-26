# Slice 23 — OpenAI gpt-image-1 + Recraft V3 providers

**Phase:** 6 — AI Gateway
**Depends on:** 22

**Definition of done:**
- `OpenAIImageProvider` calls OpenAI's `images.generate` with model `gpt-image-1`; supports multi-image input via `image[]` field for brand_reference + inspiration
- `RecraftImageProvider` calls Recraft V3 with style reference support
- Both registered with the gateway; routing promotes other-model i2i requests to gpt-image-1 when entitled

---

## Files

**Create:**
- `packages/gateway/src/providers/openai-image.ts`
- `packages/gateway/src/providers/recraft.ts`
- Tests for each

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @studio/gateway add openai
```

- [ ] **Step 2 — `openai-image.ts`**

```ts
import OpenAI from "openai";
import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse, StorageAdapter } from "@studio/shared";

const SIZE_TO_OPENAI: Record<string, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1280",
  "9:16": "1024x1792",
  "16:9": "1792x1024",
  "1.91:1": "1792x1024",
  "2:3": "1024x1536",
};

const COST_STD = 17;   // ≈ $0.17
const COST_HD = 30;

export class OpenAIImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["gpt-image-1"],
    supportsImageToImage: true,
    supportsMultiReference: true,
    tier: "premium",
  };

  private client: OpenAI;

  constructor(opts: { apiKey: string; storage: StorageAdapter }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
  }

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const size = SIZE_TO_OPENAI[req.aspectRatio] ?? "1024x1024";
    const quality = req.width * req.height > 1280 * 1280 ? "high" : "medium";

    let result;
    if (req.references && req.references.length > 0) {
      // Use the edit endpoint to enable image input
      const inputs = await Promise.all(
        req.references.map(async (r) => {
          const bytes = await this.opts.storage.getBytes(r.s3Key);
          return new File([bytes], `ref-${r.role}.png`, { type: "image/png" });
        }),
      );
      result = await this.client.images.edit({
        model: "gpt-image-1",
        prompt: req.prompt,
        image: inputs,
        size,
        quality,
        n: 1,
      });
    } else {
      result = await this.client.images.generate({
        model: "gpt-image-1",
        prompt: req.prompt,
        size,
        quality,
        n: 1,
      });
    }

    const b64 = result.data[0]?.b64_json;
    if (!b64) throw new Error("openai-no-image");

    return {
      imageBytes: Buffer.from(b64, "base64"),
      modelUsedCode: "gpt-image-1",
      upstreamCostCents: quality === "high" ? COST_HD : COST_STD,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }

  // Make storage available to the method above
  private get opts() { return (this as unknown as { _opts: { storage: StorageAdapter } })._opts; }
  static withStorage(apiKey: string, storage: StorageAdapter): OpenAIImageProvider {
    const p = new OpenAIImageProvider({ apiKey, storage });
    (p as unknown as { _opts: { storage: StorageAdapter } })._opts = { storage };
    return p;
  }
}
```

- [ ] **Step 3 — `recraft.ts`**

```ts
import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse, StorageAdapter } from "@studio/shared";

const COST_STD = 8;
const COST_LARGE = 12;

export class RecraftImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["recraft-v3"],
    supportsImageToImage: true,
    supportsMultiReference: false,
    tier: "design",
  };

  constructor(private readonly opts: { apiKey: string; storage: StorageAdapter }) {}

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const inspiration = req.references?.find((r) => r.role === "inspiration");
    const styleRefUrl = inspiration ? await this.opts.storage.getSignedUrl(inspiration.s3Key) : undefined;

    const body = {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      style: "any",
      size: `${req.width}x${req.height}`,
      style_reference_url: styleRefUrl,
      style_reference_strength: inspiration?.weight,
    };

    const res = await fetch("https://external.api.recraft.ai/v1/images/generations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`recraft-status-${res.status}`);
    const out = (await res.json()) as { data: { url: string }[] };
    const url = out.data[0]?.url;
    if (!url) throw new Error("recraft-no-output");
    const imgRes = await fetch(url);
    const bytes = Buffer.from(await imgRes.arrayBuffer());

    return {
      imageBytes: bytes,
      modelUsedCode: "recraft-v3",
      upstreamCostCents: req.width * req.height > 1024 * 1024 ? COST_LARGE : COST_STD,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}
```

- [ ] **Step 4 — Wire factory + tests (mock fetch / OpenAI)**

(Tests follow slice 22 pattern.)

- [ ] **Step 5 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(gateway): OpenAI gpt-image-1 + Recraft V3 providers (i2i support)"
```

---

## Verification

```bash
pnpm --filter @studio/gateway test
```

## Commit message

```
feat(gateway): OpenAI gpt-image-1 + Recraft V3 providers (i2i support)
```
