import { NextResponse } from "next/server";

import {
  and,
  brands,
  createDb,
  eq,
  moods,
  pickTemplates,
  templates as templatesTable,
} from "@vyora/db";
import {
  normalizeCommercialGenerationInput,
  resolveOutputTarget,
} from "@vyora/shared";
import { loadConfig } from "@vyora/shared/config";
import { buildQuickCreatePrompt } from "@vyora/shared/prompt-templates";

import { getSessionWorkspace } from "@/lib/auth/server";

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  try {
    const input = await request.json();
    const normalized = normalizeCommercialGenerationInput(input);
    if (normalized.mode !== "quick") {
      return NextResponse.json(
        {
          error: {
            code: "prompt_preview.quick_only",
            message: "Prompt preview is currently wired for Quick Create only.",
          },
        },
        { status: 422 },
      );
    }

    const config = loadConfig();
    const db = createDb(config.db.url, "app_admin");
    const target = resolveOutputTarget(normalized.outputTarget);
    const [brand] = normalized.brandId
      ? await db
          .select()
          .from(brands)
          .where(and(eq(brands.id, normalized.brandId), eq(brands.workspaceId, session.workspaceId)))
      : [null];
    const [mood] = normalized.moodId
      ? await db.select().from(moods).where(eq(moods.id, normalized.moodId))
      : [null];

    const built = buildQuickCreatePrompt({
      normalized,
      outputTarget: target,
      brand: brand
        ? {
            name: brand.name,
            palette: brand.palette,
            fonts: brand.fonts,
            voiceNotes: brand.voiceNotes,
          }
        : null,
      mood: mood
        ? {
            name: mood.name,
            promptModifiers: mood.promptModifiers,
            negativePrompts: mood.negativePrompts,
            accentPalette: mood.accentPalette,
            decorationTags: mood.decorationTags,
          }
        : null,
      outputFormat: normalized.outputs.formats[0] ?? target.format ?? target.aspectRatio,
    });

    const pickedTemplate = await pickFirstGenerationTemplate(db, normalized, target.aspectRatio);
    const promptToModel = pickedTemplate?.hasTextSafeZones
      ? `${built.prompt}\n\nLeave the indicated negative space visually quiet for renderer-owned text and logo overlays.`
      : built.prompt;
    const negativePrompt = [built.negativePrompt, mood?.negativePrompts]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join("\n");

    return NextResponse.json({
      mode: normalized.mode,
      templateId: built.templateId,
      templateVersion: built.templateVersion,
      templatePath: built.path,
      prompt: promptToModel,
      negativePrompt: negativePrompt || null,
      overlaySlots: built.overlaySlots,
      modelInstructions: built.modelInstructions,
      outputTarget: target,
      generationTemplate: pickedTemplate,
    });
  } catch (error) {
    const typed = error as Error & { code?: string; httpStatus?: number };
    return NextResponse.json(
      {
        error: {
          code: typed.code ?? "prompt_preview.failed",
          message: typed.message,
          requestId: crypto.randomUUID(),
        },
      },
      { status: typed.httpStatus ?? 400 },
    );
  }
}

async function pickFirstGenerationTemplate(
  db: ReturnType<typeof createDb>,
  normalized: ReturnType<typeof normalizeCommercialGenerationInput>,
  aspectRatio: string,
) {
  const useImageOnlyTemplate =
    normalized.mode === "quick" &&
    !normalized.moodId &&
    normalized.productRefs.length === 0 &&
    !hasCampaignDetails(normalized.campaign);
  const [picked] = await pickTemplates(db, {
    moodId: normalized.moodId,
    aspectRatio,
    n: 1,
    ...(useImageOnlyTemplate ? { preferredSlug: "quick-create-image-only" } : {}),
  });
  if (!picked) return null;
  const [template] = await db
    .select({
      id: templatesTable.id,
      slug: templatesTable.slug,
      name: templatesTable.name,
      textSafeZones: templatesTable.textSafeZones,
    })
    .from(templatesTable)
    .where(eq(templatesTable.id, picked.tid));
  return {
    id: picked.tid,
    slug: picked.slug,
    name: template?.name ?? picked.slug ?? "Template",
    preferredModel: picked.preferredModel,
    hasTextSafeZones: hasTextSafeZones(template?.textSafeZones),
  };
}

function hasCampaignDetails(campaign: Record<string, unknown>) {
  return Object.values(campaign).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

function hasTextSafeZones(value: unknown) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}
