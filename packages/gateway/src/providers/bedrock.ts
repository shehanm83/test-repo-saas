import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse } from "@layertone/shared";

const BEDROCK_SD35_COST_CENTS = 3;
const NOVA_COST_CENTS = 4;

export class BedrockImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["bedrock-sd35", "nova-canvas"],
    supportsImageToImage: false,
    supportsMultiReference: false,
    tier: "fallback",
  };

  private client: BedrockRuntimeClient;

  constructor(opts: { region: string }) {
    this.client = new BedrockRuntimeClient({ region: opts.region });
  }

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const modelId =
      req.modelCode === "nova-canvas"
        ? "amazon.nova-canvas-v1:0"
        : "stability.sd3-large-v1:0";

    const body =
      req.modelCode === "nova-canvas"
        ? {
            taskType: "TEXT_IMAGE",
            textToImageParams: { text: req.prompt, negativeText: req.negativePrompt },
            imageGenerationConfig: {
              numberOfImages: 1,
              width: req.width,
              height: req.height,
              cfgScale: 6.5,
            },
          }
        : {
            prompt: req.prompt,
            negative_prompt: req.negativePrompt,
            aspect_ratio: req.aspectRatio,
            output_format: "png",
          };

    const cmd = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    });

    const r = await this.client.send(cmd);
    const json = JSON.parse(new TextDecoder().decode(r.body)) as { images: string[] };
    const bytes = Buffer.from(json.images[0]!, "base64");

    return {
      imageBytes: bytes,
      modelUsedCode: req.modelCode,
      upstreamCostCents: req.modelCode === "nova-canvas" ? NOVA_COST_CENTS : BEDROCK_SD35_COST_CENTS,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}
