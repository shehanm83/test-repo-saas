import { z } from "zod";

const UUID = z.string().uuid();

export const QuickCreateAssetRole = z.enum([
  "product_identity",
  "style_reference",
  "composition_reference",
  "brand_reference",
  "logo_overlay",
  "certification_overlay",
  "qr_overlay",
]);

export const QuickCreateAssetSnapshot = z.object({
  id: z.string().min(1),
  sourceAssetId: UUID.optional(),
  productId: UUID.optional(),
  role: QuickCreateAssetRole,
  s3Key: z.string().min(1),
  mimeType: z.string().min(1),
  importance: z.enum(["essential", "supporting"]),
  locked: z.boolean(),
  weight: z.number().min(0).max(1).default(0.7),
  providerOrder: z.number().int().nonnegative(),
  purpose: z.string().max(240).optional(),
});

export const MoodInfluence = z.enum(["subtle", "balanced", "strong"]);
export const MoodSelectionSource = z.enum(["user_selected", "ai_suggested", "inherited"]);

export const MoodRecipe = z.object({
  version: z.number().int().positive(),
  id: UUID,
  slug: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["seasonal", "evergreen"]),
  validFrom: z.string().datetime().nullable(),
  validTo: z.string().datetime().nullable(),
  visual: z.object({
    promptModifiers: z.string(),
    lighting: z.string().optional(),
    atmosphere: z.string().optional(),
    colorTreatment: z.string().optional(),
    cameraFeel: z.string().optional(),
    surfaces: z.array(z.string()).default([]),
    compositionTendencies: z.array(z.string()).default([]),
    decorationTags: z.array(z.string()).default([]),
  }),
  negativeConstraints: z.array(z.string()).default([]),
  renderer: z.object({
    accentPalette: z.array(z.string()),
    typographyHint: z.record(z.string(), z.unknown()).nullable(),
    compatibleFamilies: z.array(z.string()).default([]),
    compatibleLayouts: z.array(z.string()).default([]),
  }),
  compatibility: z.object({
    aspectRatios: z.array(z.string()),
    providers: z.array(z.string()).default([]),
    entitled: z.boolean(),
    seasonallyValid: z.boolean(),
  }),
  referenceAssetIds: z.array(UUID).default([]),
  influence: MoodInfluence,
  selectionSource: MoodSelectionSource,
  locked: z.boolean(),
});

export const CreativePlanFacts = z.object({
  request: z.string().min(1).max(4000),
  products: z.array(z.string()).default([]),
  claims: z.array(z.string()).default([]),
  exactCopy: z.record(z.string(), z.string()).default({}),
  explicitConstraints: z.array(z.string()).default([]),
});

export const CreativePlanSuggestions = z.object({
  subject: z.string(),
  scene: z.string(),
  action: z.string(),
  audience: z.string(),
  visualStyle: z.string(),
  composition: z.string(),
  copyIntent: z.string(),
  constraints: z.array(z.string()).default([]),
});

export const MoodRecommendation = z.object({
  moodId: UUID,
  reason: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const VariantSpec = z.object({
  version: z.literal(1),
  index: z.number().int().nonnegative(),
  label: z.string().min(1).max(100),
  concept: z.string().min(1).max(600),
  composition: z.string().min(1).max(300),
  camera: z.string().min(1).max(300),
  lighting: z.string().min(1).max(300),
  artDirection: z.string().min(1).max(300),
  seed: z.number().int().nonnegative(),
  ancestry: z
    .object({
      parentGenerationId: UUID,
      parentVariantId: UUID,
      changeRequest: z.string().min(1).max(2000),
    })
    .nullable()
    .optional(),
  locks: z.object({
    identity: z.boolean(),
    claims: z.boolean(),
    exactCopy: z.boolean(),
    brand: z.boolean(),
    mood: z.boolean(),
  }),
  moodRecipe: MoodRecipe.nullable(),
});

export const QuickCreatePlan = z.object({
  version: z.literal(1),
  facts: CreativePlanFacts,
  suggestions: CreativePlanSuggestions,
  clarification: z
    .object({ question: z.string().min(1).max(500), reason: z.string().min(1).max(500) })
    .nullable(),
  moodRecommendations: z.array(MoodRecommendation).max(3),
  variants: z.array(VariantSpec).min(1).max(4),
});

export const QuickCreatePlanRequest = z.object({
  request: z.string().min(1).max(4000),
  brandId: UUID.nullable().optional(),
  productIds: z.array(UUID).max(16).default([]),
  attachmentUploadIds: z.array(UUID).max(16).default([]),
  outputTarget: z.unknown(),
  sampleCount: z.number().int().min(1).max(4).default(4),
  selectedMoodId: UUID.nullable().optional(),
  moodInfluence: MoodInfluence.default("balanced"),
  exploreMoods: z.boolean().default(false),
  exactCopy: z.record(z.string(), z.string()).default({}),
});

export type QuickCreateAssetRole = z.infer<typeof QuickCreateAssetRole>;
export type QuickCreateAssetSnapshot = z.infer<typeof QuickCreateAssetSnapshot>;
export type MoodRecipe = z.infer<typeof MoodRecipe>;
export type QuickCreatePlan = z.infer<typeof QuickCreatePlan>;
export type QuickCreatePlanRequest = z.infer<typeof QuickCreatePlanRequest>;
export type VariantSpec = z.infer<typeof VariantSpec>;
