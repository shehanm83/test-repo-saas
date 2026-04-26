import { z } from "zod";

export const Rect = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const SlotSchema = z.object({
  logo: z.object({ placement: Rect, maxWidth: z.number().min(0).max(1) }).optional(),
  headline: z
    .object({ placement: Rect, fontSizeRange: z.tuple([z.number(), z.number()]) })
    .optional(),
  subhead: z
    .object({ placement: Rect, fontSizeRange: z.tuple([z.number(), z.number()]) })
    .optional(),
  cta: z.object({ placement: Rect, style: z.enum(["pill", "rect", "ghost"]) }).optional(),
  decorations: z.array(z.object({ placement: Rect, kind: z.enum(["icon", "stock"]) })).optional(),
});

export const TextSafeZonesSchema = z.array(Rect).default([]);
export const ASPECT_RATIOS = z.enum(["1:1", "4:5", "9:16", "16:9", "1.91:1", "2:3"]);
export const MODEL_CODES = z.enum([
  "flux-1.1-pro",
  "gpt-image-1",
  "recraft-v3",
  "bedrock-sd35",
  "nova-canvas",
]);

export type SlotSpec = z.infer<typeof SlotSchema>;
export type AspectRatio = z.infer<typeof ASPECT_RATIOS>;
export type ModelCode = z.infer<typeof MODEL_CODES>;
