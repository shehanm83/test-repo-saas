# Slice 22 — Flux 1.1 Pro + Bedrock providers

**Phase:** 6 — AI Gateway
**Depends on:** 21

**Definition of done:**
- `FluxImageProvider` calls Replicate's Flux 1.1 Pro endpoint, supports both txt2img and img2img-with-references
- `BedrockImageProvider` calls Bedrock SD 3.5 + Nova Canvas as fallback
- Both translate the gateway's typed `AIImageRequest` to provider-specific payloads
- Both return upstream cost in USD cents
- Tests use HTTP mocks (msw or undici Mock)

---

## Files

**Create:**
- `packages/gateway/src/providers/flux.ts`
- `packages/gateway/src/providers/bedrock.ts`
- `packages/gateway/src/providers/flux.test.ts`
- `packages/gateway/src/providers/bedrock.test.ts`

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @studio/gateway add @aws-sdk/client-bedrock-runtime
pnpm --filter @studio/gateway add -D msw undici
```

- [ ] **Step 2 — Flux provider**

`packages/gateway/src/providers/flux.ts`:

```ts
import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse, StorageAdapter } from "@studio/shared";

const ASPECT_TO_FLUX: Record<string, string> = {
  "1:1": "1:1", "4:5": "4:5", "9:16": "9:16", "16:9": "16:9", "1.91:1": "21:9", "2:3": "2:3",
};

const FLUX_COST_CENTS_STANDARD = 4;  // ≈ $0.04 / image
const FLUX_COST_CENTS_LARGE = 8;

export class FluxImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["flux-1.1-pro"],
    supportsImageToImage: true,
    supportsMultiReference: false,  // Flux supports a single image_prompt
    tier: "fast",
  };

  constructor(private readonly opts: { replicateToken: string; storage: StorageAdapter }) {}

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const inspiration = req.references?.find((r) => r.role === "inspiration");

    // Resolve inspiration s3Key → signed URL or bytes for upload
    const imagePromptUrl = inspiration ? await this.opts.storage.getSignedUrl(inspiration.s3Key) : undefined;

    const body = {
      version: "black-forest-labs/flux-1.1-pro",
      input: {
        prompt: req.prompt,
        negative_prompt: req.negativePrompt,
        aspect_ratio: ASPECT_TO_FLUX[req.aspectRatio] ?? "1:1",
        output_format: "png",
        safety_tolerance: req.safetyLevel === "strict" ? 1 : 3,
        image_prompt: imagePromptUrl,
        image_prompt_strength: inspiration?.weight ?? 0.6,
        seed: req.seed,
      },
    };

    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.opts.replicateToken}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`flux-api-status-${res.status}`);
    const out = (await res.json()) as { output: string | string[]; status: string; error?: string };
    if (out.status !== "succeeded") throw new Error(`flux-status-${out.status}: ${out.error ?? ""}`);

    const url = Array.isArray(out.output) ? out.output[0] : out.output;
    if (!url) throw new Error("flux-no-output");

    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`flux-image-status-${imgRes.status}`);
    const bytes = Buffer.from(await imgRes.arrayBuffer());

    return {
      imageBytes: bytes,
      modelUsedCode: "flux-1.1-pro",
      upstreamCostCents: req.width * req.height > 1024 * 1024 ? FLUX_COST_CENTS_LARGE : FLUX_COST_CENTS_STANDARD,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}
```

- [ ] **Step 3 — Bedrock provider**

`packages/gateway/src/providers/bedrock.ts`:

```ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse } from "@studio/shared";

const BEDROCK_SD35_COST_CENTS = 3;
const NOVA_COST_CENTS = 4;

export class BedrockImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["bedrock-sd35", "nova-canvas"],
    supportsImageToImage: false,  // SD 3.5 supports it but we don't enable for v1 to keep simple
    supportsMultiReference: false,
    tier: "fallback",
  };

  private client: BedrockRuntimeClient;

  constructor(opts: { region: string }) {
    this.client = new BedrockRuntimeClient({ region: opts.region });
  }

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const modelId = req.modelCode === "nova-canvas" ? "amazon.nova-canvas-v1:0" : "stability.sd3-large-v1:0";

    const body =
      req.modelCode === "nova-canvas"
        ? {
            taskType: "TEXT_IMAGE",
            textToImageParams: { text: req.prompt, negativeText: req.negativePrompt },
            imageGenerationConfig: { numberOfImages: 1, width: req.width, height: req.height, cfgScale: 6.5 },
          }
        : { prompt: req.prompt, negative_prompt: req.negativePrompt, aspect_ratio: req.aspectRatio, output_format: "png" };

    const cmd = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    });

    const r = await this.client.send(cmd);
    const json = JSON.parse(new TextDecoder().decode(r.body));
    const b64 = req.modelCode === "nova-canvas" ? json.images[0] : json.images[0];
    const bytes = Buffer.from(b64, "base64");

    return {
      imageBytes: bytes,
      modelUsedCode: req.modelCode,
      upstreamCostCents: req.modelCode === "nova-canvas" ? NOVA_COST_CENTS : BEDROCK_SD35_COST_CENTS,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}
```

- [ ] **Step 4 — Wire into gateway when AI_MODE=real**

In `packages/shared/src/adapters/factory.ts`:

```ts
if (config.ai.mode === "real") {
  const gw = new Gateway();
  if (config.ai.replicateToken) gw.registerImage(new FluxImageProvider({ replicateToken: config.ai.replicateToken, storage }));
  gw.registerImage(new BedrockImageProvider({ region: config.ai.bedrockRegion }));
  // text/vision/moderation in slice 24
  ai = gw;
}
```

- [ ] **Step 5 — Tests with HTTP mock**

`packages/gateway/src/providers/flux.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FluxImageProvider } from "./flux.js";

const fetchMock = vi.fn();

describe("FluxImageProvider", () => {
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
  afterEach(() => vi.unstubAllGlobals());

  it("posts to Replicate and downloads result", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "succeeded", output: "https://cdn/img.png" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47]), { status: 200 }));

    const storage = { getSignedUrl: vi.fn(async () => "https://s/x") } as never;
    const p = new FluxImageProvider({ replicateToken: "t", storage });
    const r = await p.generate({
      modelCode: "flux-1.1-pro", prompt: "hi", aspectRatio: "1:1", width: 1024, height: 1024, safetyLevel: "default",
    });
    expect(r.modelUsedCode).toBe("flux-1.1-pro");
    expect(r.imageBytes.byteLength).toBeGreaterThan(0);
  });
});
```

(Bedrock test mocks `BedrockRuntimeClient.send`.)

- [ ] **Step 6 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(gateway): Flux 1.1 Pro + Bedrock SD 3.5 / Nova Canvas providers"
```

---

## Verification

```bash
pnpm --filter @studio/gateway test
```

## Commit message

```
feat(gateway): Flux 1.1 Pro + Bedrock SD 3.5 / Nova Canvas providers
```
