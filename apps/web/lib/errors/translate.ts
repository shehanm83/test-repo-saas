import { CODES } from "@studio/shared";

export const FRIENDLY: Record<string, string> = {
  [CODES.BILLING_INSUFFICIENT_CREDITS]: "You don't have enough credits. Top up to continue.",
  [CODES.BILLING_WORKSPACE_READ_ONLY]: "Billing is paused. Please update your payment method.",
  [CODES.GENERATION_CONCURRENT_CAP]: "You have too many generations running. Wait or upgrade your plan.",
  [CODES.SAFETY_TEXT_BLOCKED]: "Your brief was blocked by content moderation.",
  [CODES.SAFETY_IMAGE_BLOCKED]: "The generated image was blocked by content moderation.",
  [CODES.RATE_LIMIT_EXCEEDED]: "Slow down — too many requests. Try again in a minute.",
  [CODES.VALIDATION_MOOD_ASPECT_MISMATCH]: "This mood doesn't support that output size. Pick another mood or change the output.",
  [CODES.VALIDATION_FILE_TOO_LARGE]: "File is too large (max 10 MB).",
  [CODES.VALIDATION_INVALID_IMAGE]: "That doesn't look like a supported image (PNG, JPG, WebP).",
  [CODES.AUTH_INVALID_SESSION]: "Your session has expired. Please sign in again.",
  [CODES.AUTH_INSUFFICIENT_ROLE]: "You don't have permission to do that.",
  [CODES.GENERATION_MODEL_UNAVAILABLE]: "The AI model is temporarily unavailable. Please try again.",
  [CODES.GENERATION_TEMPLATE_NOT_FOUND]: "No matching template was found for your settings.",
  [CODES.VALIDATION_FAILED]: "Please check your input and try again.",
};

export function friendly(code?: string): string {
  return (code && FRIENDLY[code]) ?? "Something went wrong. Please try again.";
}
