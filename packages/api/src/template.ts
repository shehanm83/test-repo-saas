import {
  adminCreateTemplate,
  adminListTemplates,
  adminUpdateTemplate,
  createDb,
  listPublishedTemplatesForRouting,
} from "@layertone/db";
import {
  ASPECT_RATIOS,
  MODEL_CODES,
  Rect,
  SlotSchema,
  TextSafeZonesSchema,
} from "@layertone/shared/templates/schema";
import type { Config } from "@layertone/shared/config";
import { z } from "zod";

const TemplateInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  jsxSource: z.string().min(10),
  slots: SlotSchema,
  textSafeZones: TextSafeZonesSchema,
  preferredModel: MODEL_CODES,
  supportedAspectRatios: z.array(ASPECT_RATIOS).min(1),
  requiresBrowserRender: z.boolean().default(false),
  family: z.string().min(1).max(80).default("product_hero"),
  layout: z.string().min(1).max(80).default("centered_product_hero"),
  rendererCompatibility: z.enum(["satori", "browser"]).default("satori"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

const TemplateUpdateInput = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  jsxSource: z.string().min(10).optional(),
  slots: SlotSchema.optional(),
  textSafeZones: z.array(Rect).optional(),
  preferredModel: MODEL_CODES.optional(),
  supportedAspectRatios: z.array(ASPECT_RATIOS).min(1).optional(),
  requiresBrowserRender: z.boolean().optional(),
  family: z.string().min(1).max(80).optional(),
  layout: z.string().min(1).max(80).optional(),
  rendererCompatibility: z.enum(["satori", "browser"]).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export class TemplateApi {
  constructor(private readonly config: Config) {}

  private db(role: "app_user" | "app_admin" = "app_user") {
    return createDb(this.config.db.url, role);
  }

  async adminList() {
    return adminListTemplates(this.db("app_admin"));
  }

  async adminCreate(input: unknown) {
    const value = TemplateInput.parse(input);
    return adminCreateTemplate(this.db("app_admin"), value);
  }

  async adminUpdate(id: string, input: unknown) {
    const value = TemplateUpdateInput.parse(input);
    return adminUpdateTemplate(this.db("app_admin"), id, value as never);
  }

  async adminPublish(id: string) {
    return adminUpdateTemplate(this.db("app_admin"), id, { status: "published" });
  }

  async adminArchive(id: string) {
    return adminUpdateTemplate(this.db("app_admin"), id, { status: "archived" });
  }

  async listForRouting(aspectRatio: string, preferredModel?: string) {
    const parsedAspectRatio = ASPECT_RATIOS.parse(aspectRatio);
    const parsedModel = preferredModel ? MODEL_CODES.parse(preferredModel) : undefined;
    return listPublishedTemplatesForRouting(this.db(), parsedAspectRatio, parsedModel);
  }
}
