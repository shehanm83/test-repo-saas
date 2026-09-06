import { createHash } from "node:crypto";

import { billingSegmentFor } from "@layertone/billing";
import {
  brands,
  createDb,
  eq,
  getProduct,
  listApprovedMoodAssets,
  listAvailableMoods,
  listProductIdentityAssets,
  workspaces,
} from "@layertone/db";
import {
  AppError,
  CODES,
  MoodRecipe,
  QuickCreatePlan,
  QuickCreatePlanRequest,
  resolveOutputTarget,
  type Adapters,
  type Config,
  type QuickCreatePlan as QuickCreatePlanType,
  type QuickCreatePlanRequest as QuickCreatePlanRequestType,
  type VariantSpec,
} from "@layertone/shared";
import { keys } from "@layertone/storage";

const VARIANT_AXES = [
  {
    label: "Clean studio hero",
    composition: "Centered hero with generous controlled negative space",
    camera: "Eye-level, medium focal length, complete product in frame",
    lighting: "Soft directional studio light with clean separation",
    artDirection: "Minimal premium product editorial",
  },
  {
    label: "Warm lifestyle moment",
    composition: "Off-center environmental composition with contextual depth",
    camera: "Natural three-quarter view with a restrained sense of movement",
    lighting: "Warm window-like light with soft practical highlights",
    artDirection: "Human, tactile, credible lifestyle photography",
  },
  {
    label: "Bold editorial crop",
    composition: "Graphic diagonal structure while keeping every locked subject fully visible",
    camera: "Slight low angle and wider perspective for energy",
    lighting: "Harder key light with deliberate contrast and color separation",
    artDirection: "Confident contemporary campaign editorial",
  },
  {
    label: "Layered material study",
    composition: "Depth-led arrangement using foreground and background material planes",
    camera: "Close commercial lens with controlled depth of field",
    lighting: "Sculpted highlights that reveal shape, texture, and packaging",
    artDirection: "Craft-focused, refined still-life direction",
  },
] as const;

export interface PlannerGrounding {
  productDescriptions: string[];
  attachmentDescriptions: string[];
}

export class QuickCreatePlanner {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  private db(role: "app_user" | "app_admin" = "app_user") {
    return createDb(this.config.db.url, role);
  }

  async plan(args: { workspaceId: string; input: unknown }): Promise<QuickCreatePlanType> {
    const input = QuickCreatePlanRequest.parse(args.input);
    const target = resolveOutputTarget(input.outputTarget);
    const adminDb = this.db("app_admin");
    const [workspace] = await adminDb
      .select({ planCode: workspaces.planCode })
      .from(workspaces)
      .where(eq(workspaces.id, args.workspaceId))
      .limit(1);
    const entitled = billingSegmentFor(workspace?.planCode ?? "free") !== "free";

    const [brand] = input.brandId
      ? await adminDb.select().from(brands).where(eq(brands.id, input.brandId)).limit(1)
      : [null];

    const productContext = await Promise.all(
      input.productIds.map(async (productId) => {
        const product = await getProduct(this.db(), args.workspaceId, productId);
        if (!product) {
          throw new AppError(
            CODES.VALIDATION_FAILED,
            "A selected product is no longer available.",
            400,
          );
        }
        const [asset] = await listProductIdentityAssets(this.db(), args.workspaceId, productId);
        let vision = "";
        if (asset) {
          vision = await this.adapters.ai
            .describeImage(asset.s3Key)
            .then((value) => value.description)
            .catch(() => "");
        }
        return { product, vision };
      }),
    );
    const attachmentDescriptions = await Promise.all(
      input.attachmentUploadIds.map(async (uploadId) => {
        const s3Key = keys.inspirationUploadStaging(args.workspaceId, uploadId, "png");
        const description = await this.adapters.ai
          .describeImage(s3Key)
          .then((value) => value.description)
          .catch(() => "Attachment is pending visual analysis");
        return { uploadId, description };
      }),
    );

    const moods = await listAvailableMoods(this.db(), { aspectRatio: target.aspectRatio });
    const now = new Date();
    const eligibleMoods = moods.filter((mood) => entitled && isSeasonallyValid(mood, now));
    const selectedMood = input.selectedMoodId
      ? moods.find((mood) => mood.id === input.selectedMoodId)
      : null;
    if (input.selectedMoodId && !selectedMood) {
      throw new AppError(
        CODES.VALIDATION_MOOD_ASPECT_MISMATCH,
        "The selected mood is not compatible with this output format.",
        400,
      );
    }
    if (selectedMood && !entitled) {
      throw new AppError(CODES.VALIDATION_FAILED, "Your plan cannot apply this mood.", 403);
    }

    const selectedRecipe = selectedMood
      ? await moodRecipeFromRow(selectedMood, {
          influence: input.moodInfluence,
          selectionSource: "user_selected",
          locked: true,
          entitled,
          seasonallyValid: isSeasonallyValid(selectedMood, now),
          referenceAssetIds: (await listApprovedMoodAssets(this.db(), selectedMood.id)).map(
            (asset) => asset.id,
          ),
        })
      : null;
    const exploreRecipes =
      input.exploreMoods && !selectedRecipe
        ? await Promise.all(
            eligibleMoods.slice(0, input.sampleCount).map(async (mood) =>
              moodRecipeFromRow(mood, {
                influence: input.moodInfluence,
                selectionSource: "ai_suggested",
                locked: false,
                entitled,
                seasonallyValid: true,
                referenceAssetIds: (await listApprovedMoodAssets(this.db(), mood.id)).map(
                  (asset) => asset.id,
                ),
              }),
            ),
          )
        : [];

    const facts = {
      request: input.request,
      products: productContext.map(({ product }) => product.title ?? product.name),
      claims: extractClaims(input.exactCopy),
      exactCopy: input.exactCopy,
      explicitConstraints: extractExplicitConstraints(input.request),
    };
    const fallback = buildFallbackPlan(input, facts, selectedRecipe, exploreRecipes, eligibleMoods);
    const prompt = JSON.stringify({
      task: "Return only a QuickCreatePlan JSON object matching the supplied shape.",
      nonNegotiable: [
        "Keep facts verbatim and separate from suggestions.",
        "Never replace selectedMood when it is non-null.",
        "Ask no more than one clarification and only for a material contradiction.",
        "Every variant must use a meaningfully different composition, camera, lighting, and art direction.",
        "Never invent claims or exact copy.",
      ],
      requestedPlan: fallback,
      context: {
        brand: brand
          ? {
              name: brand.name,
              descriptor: brand.descriptor,
              palette: brand.palette,
              voiceNotes: brand.voiceNotes,
              voice: brand.voice,
            }
          : null,
        products: productContext.map(({ product, vision }) => ({
          name: product.name,
          title: product.title,
          description: product.description,
          category: product.category,
          features: product.keyFeatures,
          benefits: product.benefits,
          visionDescription: vision,
        })),
        attachments: attachmentDescriptions,
        outputTarget: target,
        moodCatalog: moods.map((mood) => ({
          id: mood.id,
          name: mood.name,
          kind: mood.kind,
          promptModifiers: mood.promptModifiers,
          accentPalette: mood.accentPalette,
          entitled,
          seasonallyValid: isSeasonallyValid(mood, now),
        })),
      },
    });

    let candidate = fallback;
    try {
      const response = await this.adapters.ai.generateText({
        modelCode: this.config.ai.openaiTextModel,
        systemPrompt:
          "You are a commercial creative planner. Output strict JSON only. User facts and exact assets are immutable.",
        prompt,
        maxTokens: 2200,
      });
      candidate = QuickCreatePlan.parse(JSON.parse(stripJsonFence(response.text)));
    } catch {
      // The deterministic plan is also used by mock/offline mode and if a provider violates JSON mode.
    }

    return enforcePlannerInvariants(
      candidate,
      fallback,
      input,
      selectedRecipe,
      exploreRecipes,
      eligibleMoods,
    );
  }
}

function buildFallbackPlan(
  input: QuickCreatePlanRequestType,
  facts: QuickCreatePlanType["facts"],
  selectedMood: MoodRecipe | null,
  exploreMoods: MoodRecipe[],
  eligibleMoods: Awaited<ReturnType<typeof listAvailableMoods>>,
): QuickCreatePlanType {
  const suggestions = inferSuggestions(input.request);
  const clarification = detectContradiction(input.request);
  return QuickCreatePlan.parse({
    version: 1,
    facts,
    suggestions,
    clarification,
    moodRecommendations: selectedMood
      ? []
      : eligibleMoods.slice(0, 3).map((mood, index) => ({
          moodId: mood.id,
          reason: `Compatible with the requested format and ${mood.name}'s curated visual direction.`,
          confidence: Math.max(0.55, 0.82 - index * 0.09),
        })),
    variants: Array.from({ length: input.sampleCount }, (_, index) =>
      variantFromAxis(
        index,
        input,
        suggestions,
        selectedMood ?? moodForVariant(exploreMoods, index),
      ),
    ),
  });
}

function enforcePlannerInvariants(
  candidate: QuickCreatePlanType,
  fallback: QuickCreatePlanType,
  input: QuickCreatePlanRequestType,
  selectedMood: MoodRecipe | null,
  exploreMoods: MoodRecipe[],
  eligibleMoods: Awaited<ReturnType<typeof listAvailableMoods>>,
) {
  const eligibleIds = new Set(eligibleMoods.map((mood) => mood.id));
  const recommendations = candidate.moodRecommendations
    .filter((item) => eligibleIds.has(item.moodId))
    .slice(0, 3);
  const variants = Array.from({ length: input.sampleCount }, (_, index) => {
    const proposed = candidate.variants[index];
    const safe = fallback.variants[index]!;
    return {
      ...safe,
      ...(proposed?.concept ? { concept: proposed.concept } : {}),
      version: 1 as const,
      index,
      seed: stableSeed(`${input.request}:${index}`),
      locks: { identity: true, claims: true, exactCopy: true, brand: true, mood: !!selectedMood },
      moodRecipe: selectedMood ?? moodForVariant(exploreMoods, index),
    } satisfies VariantSpec;
  });
  return QuickCreatePlan.parse({
    ...candidate,
    facts: fallback.facts,
    clarification: candidate.clarification ?? fallback.clarification,
    moodRecommendations: selectedMood ? [] : recommendations,
    variants,
  });
}

function moodForVariant(moods: MoodRecipe[], index: number) {
  return moods.length > 0 ? (moods[index % moods.length] ?? null) : null;
}

function variantFromAxis(
  index: number,
  input: QuickCreatePlanRequestType,
  suggestions: QuickCreatePlanType["suggestions"],
  moodRecipe: MoodRecipe | null,
): VariantSpec {
  const axis = VARIANT_AXES[index % VARIANT_AXES.length]!;
  return {
    version: 1,
    index,
    label: axis.label,
    concept: `${axis.artDirection}. ${suggestions.scene}`,
    composition: axis.composition,
    camera: axis.camera,
    lighting: axis.lighting,
    artDirection: axis.artDirection,
    seed: stableSeed(`${input.request}:${index}`),
    locks: { identity: true, claims: true, exactCopy: true, brand: true, mood: !!moodRecipe },
    moodRecipe,
  };
}

function inferSuggestions(request: string): QuickCreatePlanType["suggestions"] {
  const lifestyle = /person|people|lifestyle|using|wearing|holding/i.test(request);
  return {
    subject: "The explicitly requested subject and any selected products",
    scene: lifestyle
      ? "A credible real-world moment supporting the request"
      : "A polished commercial setting supporting the request",
    action: lifestyle
      ? "Natural interaction without obscuring the product"
      : "A composed product-led presentation",
    audience: "The audience stated by the user or the selected product context",
    visualStyle: "Contemporary, polished commercial imagery",
    composition: "Format-aware composition with protected identity and overlay-safe space",
    copyIntent: "Reserve exact copy for deterministic renderer overlays",
    constraints: [
      "Preserve product identity",
      "Do not generate logos, certification marks, QR codes, or exact copy",
    ],
  };
}

function detectContradiction(request: string) {
  if (
    /\b(no text|without text)\b/i.test(request) &&
    /\b(says|headline|caption|text reads)\b/i.test(request)
  ) {
    return {
      question: "Should the final creative include the requested copy, or contain no text?",
      reason: "The request asks for copy and also asks for no text.",
    };
  }
  return null;
}

function extractClaims(exactCopy: Record<string, string>) {
  return Object.entries(exactCopy)
    .filter(([key, value]) => value.trim() && /price|discount|badge|legal|offer/i.test(key))
    .map(([key, value]) => `${key}: ${value}`);
}

function extractExplicitConstraints(request: string) {
  return request
    .split(/[.!?\n]/)
    .map((part) => part.trim())
    .filter((part) => /\b(must|never|do not|don't|keep|exact|without|only)\b/i.test(part))
    .slice(0, 12);
}

function stripJsonFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

function stableSeed(value: string) {
  return Number.parseInt(createHash("sha256").update(value).digest("hex").slice(0, 7), 16);
}

function isSeasonallyValid(mood: { validFrom: Date | null; validTo: Date | null }, now: Date) {
  return (!mood.validFrom || mood.validFrom <= now) && (!mood.validTo || mood.validTo >= now);
}

export async function moodRecipeFromRow(
  mood: Awaited<ReturnType<typeof listAvailableMoods>>[number],
  options: {
    influence: "subtle" | "balanced" | "strong";
    selectionSource: "user_selected" | "ai_suggested" | "inherited";
    locked: boolean;
    entitled: boolean;
    seasonallyValid: boolean;
    referenceAssetIds: string[];
  },
) {
  const recipe = mood.recipe ?? {};
  return MoodRecipe.parse({
    version: mood.recipeVersion,
    id: mood.id,
    slug: mood.slug,
    name: mood.name,
    kind: mood.kind,
    validFrom: mood.validFrom?.toISOString() ?? null,
    validTo: mood.validTo?.toISOString() ?? null,
    visual: {
      promptModifiers: mood.promptModifiers,
      lighting: recipe.lighting,
      atmosphere: recipe.atmosphere,
      colorTreatment: recipe.colorTreatment,
      cameraFeel: recipe.cameraFeel,
      surfaces: recipe.surfaces ?? [],
      compositionTendencies: recipe.compositionTendencies ?? [],
      decorationTags: mood.decorationTags ?? [],
    },
    negativeConstraints: mood.negativePrompts
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
    renderer: {
      accentPalette: mood.accentPalette,
      typographyHint: (mood.typographyHint as Record<string, unknown> | null) ?? null,
      compatibleFamilies: recipe.compatibleFamilies ?? [],
      compatibleLayouts: recipe.compatibleLayouts ?? [],
    },
    compatibility: {
      aspectRatios: mood.supportedAspectRatios,
      providers: recipe.supportedProviders ?? [],
      entitled: options.entitled,
      seasonallyValid: options.seasonallyValid,
    },
    referenceAssetIds: options.referenceAssetIds,
    influence: options.influence,
    selectionSource: options.selectionSource,
    locked: options.locked,
  });
}
