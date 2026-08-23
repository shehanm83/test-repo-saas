export type QuickCreateEvent =
  | "generate_requested"
  | "directions_planned"
  | "prompt_preview_opened"
  | "generation_started"
  | "generation_failed"
  | "upload_started"
  | "upload_completed"
  | "upload_failed"
  | "result_viewed"
  | "result_downloaded"
  | "result_accepted"
  | "refinement_started"
  | "result_rejected"
  | "text_edit_opened";

export function trackQuickCreateEvent(
  event: QuickCreateEvent,
  tags: Record<string, string | number | boolean | null | undefined> = {},
) {
  const safeTags = Object.fromEntries(
    Object.entries(tags)
      .filter(([, value]) => value !== null && value !== undefined)
      .slice(0, 8)
      .map(([key, value]) => [key, String(value).slice(0, 80)]),
  );

  void fetch("/api/events/quick-create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, tags: safeTags }),
    keepalive: true,
  }).catch(() => undefined);
}
