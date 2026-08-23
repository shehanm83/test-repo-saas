import type { AIImageReference } from "@layertone/shared";
import type { ImageProvider } from "./types";

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
  referencesOrHasInspiration: AIImageReference[] | boolean,
): RouteResult {
  const references = Array.isArray(referencesOrHasInspiration) ? referencesOrHasInspiration : [];
  const hasInspiration =
    typeof referencesOrHasInspiration === "boolean"
      ? referencesOrHasInspiration
      : references.length > 0;
  const requested = registry.get(requestedModel);
  if (!requested) throw new Error(`unknown model: ${requestedModel}`);

  if (!hasInspiration) {
    return {
      provider: requested,
      modelCode: requestedModel,
      substituted: false,
      needsVisionFallback: false,
    };
  }

  if (providerSupports(requested, references)) {
    return {
      provider: requested,
      modelCode: requestedModel,
      substituted: false,
      needsVisionFallback: false,
    };
  }

  // Promotion: pick a same-or-higher-tier i2i-capable model
  const promotionOrder = ["gpt-image-2", "flux-1.1-pro", "recraft-v3"];
  for (const candidate of promotionOrder) {
    const p = registry.get(candidate);
    if (p && providerSupports(p, references)) {
      return { provider: p, modelCode: candidate, substituted: true, needsVisionFallback: false };
    }
  }

  if (references.some((reference) => reference.importance === "essential")) {
    throw new Error(
      `essential references unsupported: ${references.map((reference) => reference.role).join(", ")}`,
    );
  }

  // Supporting style references may be translated to vision text as a last resort.
  return {
    provider: requested,
    modelCode: requestedModel,
    substituted: false,
    needsVisionFallback: true,
  };
}

function providerSupports(provider: ImageProvider, references: AIImageReference[]) {
  if (!provider.capabilities.supportsImageToImage) return false;
  const max =
    provider.capabilities.maxReferences ??
    (provider.capabilities.supportsMultiReference ? Number.POSITIVE_INFINITY : 1);
  if (references.length > max) return false;
  const accepted = provider.capabilities.referenceRoles;
  if (accepted && references.some((reference) => !accepted.includes(reference.role))) return false;
  if (
    references.some((reference) => reference.role === "product_identity") &&
    !provider.capabilities.supportsIdentityPreservation
  )
    return false;
  return true;
}
