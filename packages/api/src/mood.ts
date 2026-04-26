import {
  adminBindings,
  adminCreateMood,
  adminListMoods,
  adminUpdateMood,
  createDb,
  listAvailableMoods,
  setBindings,
} from "@studio/db";
import { ASPECT_RATIOS } from "@studio/shared";
import type { Config } from "@studio/shared/config";
import { z } from "zod";

const AspectRatioSchema = z.enum(ASPECT_RATIOS.options);
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
});

const MoodInput = MoodInputBase.refine(
  (input) =>
    !(input.validFrom && input.validTo) || new Date(input.validFrom) < new Date(input.validTo),
  { message: "validFrom must be before validTo" },
);

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
    return adminCreateMood(this.db("app_admin"), {
      ...value,
      validFrom: value.validFrom ? new Date(value.validFrom) : null,
      validTo: value.validTo ? new Date(value.validTo) : null,
    });
  }

  async adminUpdate(id: string, input: unknown) {
    const value = MoodInputBase.partial().parse(input);
    return adminUpdateMood(this.db("app_admin"), id, {
      ...(value.slug ? { slug: value.slug } : {}),
      ...(value.name ? { name: value.name } : {}),
      ...(value.kind ? { kind: value.kind } : {}),
      ...(value.validFrom ? { validFrom: new Date(value.validFrom) } : {}),
      ...(value.validTo ? { validTo: new Date(value.validTo) } : {}),
      ...(value.promptModifiers ? { promptModifiers: value.promptModifiers } : {}),
      ...(value.negativePrompts ? { negativePrompts: value.negativePrompts } : {}),
      ...(value.accentPalette ? { accentPalette: value.accentPalette } : {}),
      ...(value.decorationTags ? { decorationTags: value.decorationTags } : {}),
      ...(value.typographyHint ? { typographyHint: value.typographyHint } : {}),
      ...(value.supportedAspectRatios
        ? { supportedAspectRatios: value.supportedAspectRatios }
        : {}),
    });
  }

  async adminPublish(id: string) {
    return adminUpdateMood(this.db("app_admin"), id, { status: "published" });
  }

  async adminArchive(id: string) {
    return adminUpdateMood(this.db("app_admin"), id, { status: "archived" });
  }

  async adminBindings(moodId: string) {
    return adminBindings(this.db("app_admin"), moodId);
  }

  async adminSetBindings(moodId: string, input: unknown) {
    const bindings = z
      .array(z.object({ templateId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i), weight: z.number().int().min(1).max(1000) }))
      .parse(input);
    await setBindings(this.db("app_admin"), moodId, bindings);
  }
}
