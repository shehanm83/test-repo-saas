import {
  addRouting,
  assignStrength,
  assignTag,
  createDb,
  createModel,
  createStrength,
  createTag,
  deleteModel,
  deleteRouting,
  deleteStrength,
  deleteTag,
  getModel,
  listActiveModels,
  listRouting,
  listStrengths,
  listTags,
  removeStrength,
  removeTag,
  updateModel,
  updateRouting,
  updateStrength,
  updateTag,
} from "@vyora/db";
import type { Config } from "@vyora/shared/config";
import { z } from "zod";

const StrengthInput = z.object({
  code: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
});
const ModelInput = z.object({
  code: z.string().min(1).max(64),
  displayName: z.string().min(1).max(80),
  description: z.string().optional(),
  vendor: z.string().min(1).max(40),
  llmModelId: z.string().min(1).max(120),
  status: z.enum(["active", "paused", "deprecated"]).default("active"),
});
const TagInput = z.object({
  code: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  description: z.string().optional(),
});
const RoutingInput = z.object({
  tierCode: z.string().min(1),
  strengthCode: z.string().nullable(),
  modelCode: z.string().min(1),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});
const RoutingPatch = z.object({
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export class TaxonomyApi {
  constructor(private readonly config: Config) {}
  private db() {
    return createDb(this.config.db.url, "app_admin");
  }

  // Strengths
  listStrengths() {
    return listStrengths(this.db());
  }
  createStrength(input: unknown) {
    return createStrength(this.db(), StrengthInput.parse(input));
  }
  updateStrength(code: string, patch: unknown) {
    return updateStrength(this.db(), code, StrengthInput.partial().parse(patch) as never);
  }
  deleteStrength(code: string) {
    return deleteStrength(this.db(), code);
  }

  // Models
  listModels() {
    return listActiveModels(this.db());
  }
  getModel(code: string) {
    return getModel(this.db(), code);
  }
  createModel(input: unknown) {
    return createModel(this.db(), ModelInput.parse(input));
  }
  updateModel(code: string, patch: unknown) {
    return updateModel(this.db(), code, ModelInput.partial().parse(patch) as never);
  }
  deleteModel(code: string) {
    return deleteModel(this.db(), code);
  }
  assignStrength(modelCode: string, strengthCode: string) {
    return assignStrength(this.db(), modelCode, strengthCode);
  }
  removeStrength(modelCode: string, strengthCode: string) {
    return removeStrength(this.db(), modelCode, strengthCode);
  }
  assignTag(modelCode: string, tagCode: string) {
    return assignTag(this.db(), modelCode, tagCode);
  }
  removeTag(modelCode: string, tagCode: string) {
    return removeTag(this.db(), modelCode, tagCode);
  }

  // Tags
  listTags() {
    return listTags(this.db());
  }
  createTag(input: unknown) {
    return createTag(this.db(), TagInput.parse(input));
  }
  updateTag(code: string, patch: unknown) {
    return updateTag(this.db(), code, TagInput.partial().parse(patch) as never);
  }
  deleteTag(code: string) {
    return deleteTag(this.db(), code);
  }

  // Routing
  listRouting() {
    return listRouting(this.db());
  }
  addRouting(input: unknown) {
    return addRouting(this.db(), RoutingInput.parse(input));
  }
  updateRouting(id: string, patch: unknown) {
    return updateRouting(this.db(), id, RoutingPatch.parse(patch) as never);
  }
  deleteRouting(id: string) {
    return deleteRouting(this.db(), id);
  }
}
