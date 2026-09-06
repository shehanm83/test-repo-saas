import type { ModerationProvider } from "./types";

export async function preFlightModerate(
  mp: ModerationProvider | null,
  text: string,
): Promise<void> {
  if (!mp) return;
  const r = await mp.moderateText(text);
  if (r.flagged) {
    const e = new Error(`safety-blocked: ${r.categories.join(",")}`);
    (e as Error & { code?: string }).code = "safety.text_blocked";
    throw e;
  }
}

export async function postFlightModerate(
  mp: ModerationProvider | null,
  bytes: Uint8Array,
): Promise<string[]> {
  if (!mp) return [];
  const r = await mp.moderateImage(bytes);
  if (r.flagged) {
    const e = new Error(`safety-blocked-image: ${r.categories.join(",")}`);
    (e as Error & { code?: string }).code = "safety.image_blocked";
    throw e;
  }
  return [];
}
