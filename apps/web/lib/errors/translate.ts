import { CODES } from "@layertone/shared/errors/codes";

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
  [CODES.GENERATION_NOT_FOUND]: "We couldn't find that generation.",
  [CODES.GENERATION_VARIANT_NOT_FOUND]: "We couldn't find that variant.",
  [CODES.AUP_BRIEF_BLOCKED]:
    "This brief was blocked by content policy. Edit your brief or contact support if this is a mistake.",
  [CODES.WORKSPACE_SUSPENDED]:
    "This workspace has been suspended. Contact support if you believe this is a mistake.",
  [CODES.VALIDATION_FAILED]: "Please check your input and try again.",
  [CODES.VALIDATION_NO_TEMPLATE]: "No matching template was found for your settings.",
};

export function friendly(code?: string): string {
  return (code && FRIENDLY[code]) ?? "Something went wrong. Please try again.";
}
