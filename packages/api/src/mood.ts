import {
  adminBindings,
  adminCreateMood,
  adminDeleteMood,
  adminListMoods,
  adminUpdateMood,
  createDb,
  listAvailableMoods,
  setBindings,
} from "@layertone/db";
import { ASPECT_RATIOS } from "@layertone/shared/templates/schema";
import type { Config } from "@layertone/shared/config";
import { z } from "zod";

const AspectRatioSchema = z.enum(ASPECT_RATIOS.options);
const MoodRecipeSchema = z.object({
  lighting: z.string().max(300).optional(),
  atmosphere: z.string().max(300).optional(),
  colorTreatment: z.string().max(300).optional(),
  cameraFeel: z.string().max(300).optional(),
  surfaces: z.array(z.string().min(1).max(120)).max(24).optional(),
  compositionTendencies: z.array(z.string().min(1).max(180)).max(24).optional(),
  compatibleFamilies: z.array(z.string().min(1).max(100)).max(24).optional(),
  compatibleLayouts: z.array(z.string().min(1).max(100)).max(24).optional(),
  supportedProviders: z.array(z.string().min(1).max(100)).max(24).optional(),
});
const MoodInputBase = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  kind: z.enum(["seasonal", "evergreen"]),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  promptModifiers: z.string().default(""),
  negativePrompts: z.string().default(""),
  accentPalette: z.array(z.string()).max(5).default([]),
  decorationTags: z.array(z.string()).default([]),
  typographyHint: z
    .object({ weight: z.string().optional(), justification: z.string().optional() })
    .optional(),
  supportedAspectRatios: z.array(AspectRatioSchema).min(1),
  recipeVersion: z.number().int().positive().default(1),
  recipe: MoodRecipeSchema.nullable().optional(),
});

const MoodInput = MoodInputBase.refine(
  (input) =>
    !(input.validFrom && input.validTo) || new Date(input.validFrom) < new Date(input.validTo),
  { message: "validFrom must be before validTo" },
);

function cleanMoodRecipe(recipe: z.infer<typeof MoodRecipeSchema>) {
  return {
    ...(recipe.lighting !== undefined ? { lighting: recipe.lighting } : {}),
    ...(recipe.atmosphere !== undefined ? { atmosphere: recipe.atmosphere } : {}),
    ...(recipe.colorTreatment !== undefined ? { colorTreatment: recipe.colorTreatment } : {}),
    ...(recipe.cameraFeel !== undefined ? { cameraFeel: recipe.cameraFeel } : {}),
    ...(recipe.surfaces !== undefined ? { surfaces: recipe.surfaces } : {}),
    ...(recipe.compositionTendencies !== undefined
      ? { compositionTendencies: recipe.compositionTendencies }
      : {}),
    ...(recipe.compatibleFamilies !== undefined
      ? { compatibleFamilies: recipe.compatibleFamilies }
      : {}),
    ...(recipe.compatibleLayouts !== undefined
      ? { compatibleLayouts: recipe.compatibleLayouts }
      : {}),
    ...(recipe.supportedProviders !== undefined
      ? { supportedProviders: recipe.supportedProviders }
      : {}),
  };
}

export class MoodApi {
  constructor(private readonly config: Config) {}

  private db(role: "app_user" | "app_admin" = "app_user") {
    return createDb(this.config.db.url, role);
  }

  async listAvailable(args: { aspectRatio?: string }) {
    const aspectRatio = args.aspectRatio ? AspectRatioSchema.parse(args.aspectRatio) : undefined;
    return listAvailableMoods(this.db(), aspectRatio ? { aspectRatio } : {});
  }

  async adminList() {
    return adminListMoods(this.db("app_admin"));
  }

  async adminCreate(input: unknown) {
    const value = MoodInput.parse(input);
    const { recipe, ...rest } = value;
    return adminCreateMood(this.db("app_admin"), {
      ...rest,
      ...(recipe === undefined ? {} : { recipe: recipe === null ? null : cleanMoodRecipe(recipe) }),
      validFrom: value.validFrom ? new Date(value.validFrom) : null,
      validTo: value.validTo ? new Date(value.validTo) : null,
    });
  }

  async adminUpdate(id: string, input: unknown) {
    const UpdateSchema = MoodInputBase.partial().extend({
      promptModifiers: z.string().optional(),
      negativePrompts: z.string().optional(),
      accentPalette: z.array(z.string()).max(5).optional(),
      decorationTags: z.array(z.string()).optional(),
      recipeVersion: z.number().int().positive().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    });
    const value = UpdateSchema.parse(input);
    return adminUpdateMood(this.db("app_admin"), id, {
      ...("slug" in value && value.slug ? { slug: value.slug } : {}),
      ...("name" in value && value.name ? { name: value.name } : {}),
      ...("kind" in value && value.kind ? { kind: value.kind } : {}),
      ...("validFrom" in value
        ? { validFrom: value.validFrom ? new Date(value.validFrom) : null }
        : {}),
      ...("validTo" in value ? { validTo: value.validTo ? new Date(value.validTo) : null } : {}),
      ...("promptModifiers" in value ? { promptModifiers: value.promptModifiers ?? "" } : {}),
      ...("negativePrompts" in value ? { negativePrompts: value.negativePrompts ?? "" } : {}),
      ...("accentPalette" in value ? { accentPalette: value.accentPalette ?? [] } : {}),
      ...("decorationTags" in value ? { decorationTags: value.decorationTags ?? [] } : {}),
      ...("typographyHint" in value && value.typographyHint
        ? { typographyHint: value.typographyHint }
        : {}),
      ...("supportedAspectRatios" in value && value.supportedAspectRatios
        ? { supportedAspectRatios: value.supportedAspectRatios }
        : {}),
      ...("recipeVersion" in value && value.recipeVersion
        ? { recipeVersion: value.recipeVersion }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(value, "recipe")
        ? { recipe: value.recipe ? cleanMoodRecipe(value.recipe) : null }
        : {}),
      ...("status" in value && value.status ? { status: value.status } : {}),
    });
  }

  async adminPublish(id: string) {
    return adminUpdateMood(this.db("app_admin"), id, { status: "published" });
  }

  async adminArchive(id: string) {
    return adminUpdateMood(this.db("app_admin"), id, { status: "archived" });
  }

  async adminDelete(id: string) {
    await adminDeleteMood(this.db("app_admin"), id);
  }

  async adminBindings(moodId: string) {
    return adminBindings(this.db("app_admin"), moodId);
  }

  async adminSetBindings(moodId: string, input: unknown) {
    const bindings = z
      .array(
        z.object({
          templateId: z
            .string()
            .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
          weight: z.number().int().min(1).max(1000),
        }),
      )
      .parse(input);
    await setBindings(this.db("app_admin"), moodId, bindings);
  }
}
