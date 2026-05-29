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
  const promotionOrder = ["gpt-image-2", "flux-1.1-pro", "recraft-v3"];
  for (const candidate of promotionOrder) {
    const p = registry.get(candidate);
    if (p?.capabilities.supportsImageToImage) {
      return { provider: p, modelCode: candidate, substituted: true, needsVisionFallback: false };
    }
  }

  // No i2i-capable model — vision fallback
  return { provider: requested, modelCode: requestedModel, substituted: false, needsVisionFallback: true };
}
