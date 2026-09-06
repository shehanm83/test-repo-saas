import { z } from "zod";

export const PromptTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["image_generation", "modifier"]),
  version: z.number().int().positive(),
  compatible_models: z.array(z.string().min(1)).min(1),
  temperature: z.number().min(0).max(2).nullable().optional(),
  tags: z.array(z.string().min(1)).default([]),
  variables: z.object({
    required: z.array(z.string().min(1)).default([]),
    optional: z.array(z.string().min(1)).default([]),
  }),
  safety_rules: z.array(z.string().min(1)).default([]),
  overlay_contract: z.object({
    renderer_owns: z.array(z.string().min(1)).default([]),
    model_owns: z.array(z.string().min(1)).default([]),
    safe_zone_instruction: z.string().optional(),
  }),
  expected_output: z
    .object({
      type: z.string().min(1),
      schema: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  prompt: z.string().min(1),
  negative_prompt: z.string().optional(),
});

export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;

export interface PromptOverlaySlots {
  logoAssetIds?: string[];
  headline?: string;
  subtitle?: string;
  price?: string;
  discount?: string;
  badgeText?: string;
  cta?: string;
  offerExpiry?: string;
  legalText?: string;
  website?: string;
  phone?: string;
  qrUrl?: string;
}

export interface BuiltPrompt {
  templateId: string;
  templateVersion: number;
  path: string;
  prompt: string;
  negativePrompt?: string;
  overlaySlots: PromptOverlaySlots;
  modelInstructions: {
    compatibleModels: string[];
    safetyRules: string[];
  };
}
