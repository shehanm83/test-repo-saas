import { Ledger } from "@layertone/billing";
import {
  createDb,
  getGenerationFull,
  generationVariants,
  generations,
  brandAssets,
  brands,
  moods,
  templates as templatesTable,
} from "@layertone/db";
import { tagSpan } from "@layertone/observability";
import { render } from "@layertone/renderer";
import type {
  Adapters,
  Config,
  AIImageRequest,
  NormalizedCommercialGenerationInput,
  ResolvedOutputTarget,
} from "@layertone/shared";
import {
  buildQuickCreatePrompt,
  NO_CROP_NEGATIVE_PROMPT,
  NO_CROP_PROMPT_INSTRUCTION,
  type BuiltPrompt,
} from "@layertone/shared/prompt-templates";
import { keys } from "@layertone/storage";
import { and, eq, inArray, sql } from "drizzle-orm";

// Backward-compatible: stored as JSON array string or legacy plain s3 key
function parseInspirationKeys(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {
    /* not JSON */
  }
  return [raw];
}

function dedupeReferences(
  refs: { s3Key: string; role: "brand_reference" | "inspiration"; weight: number }[],
) {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.role}:${ref.s3Key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildLegacyPromptParts(args: {
  brief: string;
  selectedLogoRefs: { s3Key: string; role: "brand_reference"; weight: number }[];
  commercial: CommercialSettings | undefined;
  moodPromptModifiers?: string | null;
  hasTextSafeZones: boolean;
}) {
  const promptParts = [args.brief];
  if (args.selectedLogoRefs.length > 0) {
    promptParts.push(
      "Use the selected brand logo reference asset(s). Preserve the logo identity and do not invent a different logo.",
    );
  }
  if (args.commercial?.campaign) {
    const campaign = args.commercial.campaign;
    const campaignParts = [
      campaign.title ? `Campaign title: ${campaign.title}` : null,
      campaign.subtitle ? `Subtitle: ${campaign.subtitle}` : null,
      campaign.message ? `Message: ${campaign.message}` : null,
      campaign.price ? `Price: ${campaign.price}` : null,
      campaign.discount ? `Discount: ${campaign.discount}` : null,
      campaign.badgeText ? `Badge: ${campaign.badgeText}` : null,
      campaign.cta ? `CTA: ${campaign.cta}` : null,
      campaign.targetAudience ? `Target audience: ${campaign.targetAudience}` : null,
      campaign.benefits?.length ? `Benefits: ${campaign.benefits.join(", ")}` : null,
    ].filter(Boolean);
    if (campaignParts.length > 0) promptParts.push(campaignParts.join("\n"));
  }
  if (args.commercial?.product_refs?.length) {
    const products = args.commercial.product_refs
      .map((ref) => ref.commercialFields?.title ?? ref.commercialFields?.name)
      .filter(Boolean);
    if (products.length > 0) promptParts.push(`Featured products: ${products.join(", ")}`);
  }
  if (args.commercial?.template) {
    promptParts.push(
      `Commercial layout intent: ${args.commercial.template.family ?? "product"} / ${args.commercial.template.layout ?? "template"}.`,
    );
  }
  if (args.commercial?.composition) {
    promptParts.push(`Composition controls: ${JSON.stringify(args.commercial.composition)}.`);
  }
  if (args.moodPromptModifiers) promptParts.push(args.moodPromptModifiers);
  if (args.hasTextSafeZones) {
    promptParts.push("Leave the indicated negative space visually quiet for headline overlay.");
  }
  promptParts.push(NO_CROP_PROMPT_INSTRUCTION);
  return promptParts;
}

function buildQuickCreateNormalized(args: {
  settings: WorkerSettings;
  commercial: CommercialSettings;
  brandId: string | null;
  moodId: string | null;
  brief: string;
}): NormalizedCommercialGenerationInput {
  const flags = args.settings.flags ?? {};
  return {
    mode: args.commercial.mode === "campaign_builder" ? "campaign_builder" : "quick",
    creationType: args.commercial.creation_type ?? "single_product",
    brandId: args.brandId,
    projectId: args.commercial.project_id ?? null,
    moodId: args.moodId,
    brief: args.brief,
    outputTarget: args.settings.output_target,
    productRefs: (args.commercial.product_refs ?? []).map((ref) => ({
      role: ref.role ?? "hero",
      ...(ref.productId ? { productId: ref.productId } : {}),
      ...(ref.uploadId ? { uploadId: ref.uploadId } : {}),
      ...(ref.commercialFields ? { commercialFields: ref.commercialFields } : {}),
    })),
    brandLogoAssetIds: args.commercial.brand_logo_asset_ids ?? [],
    campaign: args.commercial.campaign ?? {},
    template: args.commercial.template ?? {
      family: "product_hero",
      layout: "centered_product_hero",
    },
    composition: args.commercial.composition ?? {
      productSize: "balanced",
      productPosition: "template",
      backgroundStyle: "studio",
      realism: "realistic_photo",
      shadowReflection: "soft_shadow",
      labelVisibility: "preserve",
      packagingVisibility: "product_only",
      keepOriginalShape: true,
      brandBlend: "medium",
    },
    outputs: args.commercial.outputs ?? {
      variants: 1,
      quality: flags.usePremiumModel ? "premium" : "standard",
      consistency: "off",
      formats: ["product_card"],
    },
    inspirationUploadIds: [],
    stockAssetId: null,
    flags: {
      useBrandColors: flags.useBrandColors ?? true,
      useBrandLogo: flags.useBrandLogo ?? true,
      useBrandFonts: flags.useBrandFonts ?? true,
      brandStrict: flags.brandStrict ?? false,
      applyMoodModifiers: flags.applyMoodModifiers ?? true,
      applyMoodDecorations: flags.applyMoodDecorations ?? true,
      applyMoodAccentColors: flags.applyMoodAccentColors ?? true,
      usePremiumModel: flags.usePremiumModel ?? false,
    },
  };
}

function resolveWorkerTarget(
  outputTarget: WorkerSettings["output_target"],
  primaryOutputTarget?: ResolvedOutputTarget,
): ResolvedOutputTarget {
  if (outputTarget?.kind) return outputTarget;
  if (primaryOutputTarget?.kind) return primaryOutputTarget;
  if (outputTarget) {
    return {
      kind: "image",
      platform: null,
      format: null,
      aspectRatio: outputTarget.aspectRatio,
      width: outputTarget.width,
      height: outputTarget.height,
    };
  }
  return { kind: "image", platform: null, format: null, aspectRatio: "1:1", width: 1080, height: 1080 };
}

function combineNegativePrompts(...values: Array<string | null | undefined>) {
  const combined = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n");
  return combined || undefined;
}

async function persistQuickPromptMetadata(
  dbAdmin: DbAdmin,
  generationId: string,
  settings: WorkerSettings,
  prompt: BuiltPrompt,
) {
  await dbAdmin
    .update(generations)
    .set({
      settings: {
        ...settings,
        commercial: {
          ...settings.commercial,
          prompt: {
            prompt_template_id: prompt.templateId,
            prompt_template_version: prompt.templateVersion,
            prompt_template_path: prompt.path,
            rendered_prompt: prompt.prompt,
            rendered_negative_prompt: prompt.negativePrompt ?? null,
            overlay_slots: prompt.overlaySlots,
            compatible_models: prompt.modelInstructions.compatibleModels,
            safety_rules: prompt.modelInstructions.safetyRules,
          },
        },
      },
    })
    .where(eq(generations.id, generationId));
}

async function loadRendererLogo(
  storage: Adapters["storage"],
  asset?: LogoAssetRow,
): Promise<{
  logoSvg?: string;
  logoPng?: { bytes: Uint8Array; width: number; height: number };
} | null> {
  if (!asset) return null;
  try {
    const bytes = await storage.getBytes(asset.s3Key);
    if (asset.mimeType === "image/svg+xml") {
      return { logoSvg: Buffer.from(bytes).toString("utf8") };
    }
    return {
      logoPng: {
        bytes,
        width: asset.width ?? 512,
        height: asset.height ?? 512,
      },
    };
  } catch {
    return null;
  }
}

export interface VariantJob {
  generationId: string;
  variantId: string;
  workspaceId: string;
}

type DbAdmin = ReturnType<typeof createDb>;

type WorkerSettings = {
  output_target: ResolvedOutputTarget;
  flags?: Record<string, boolean>;
  usePremiumModel?: boolean;
  commercial?: CommercialSettings;
};

type CommercialSettings = {
  mode?: "quick" | "campaign_builder" | "legacy";
  creation_type?: NormalizedCommercialGenerationInput["creationType"];
  project_id?: string | null;
  product_refs?: Array<
    Partial<NormalizedCommercialGenerationInput["productRefs"][number]> & {
      commercialFields?: NormalizedCommercialGenerationInput["productRefs"][number]["commercialFields"];
    }
  >;
  brand_logo_asset_ids?: string[];
  campaign?: NormalizedCommercialGenerationInput["campaign"];
  template?: NormalizedCommercialGenerationInput["template"];
  composition?: NormalizedCommercialGenerationInput["composition"];
  outputs?: NormalizedCommercialGenerationInput["outputs"];
  primary_output_target?: ResolvedOutputTarget;
  prompt?: unknown;
};

type LogoAssetRow = {
  s3Key: string;
  mimeType: string;
  width: number | null;
  height: number | null;
};

export class GenerationWorker {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  async handle(job: VariantJob): Promise<void> {
    const start = Date.now();
    tagSpan("worker.variant", {
      generationId: job.generationId,
      variantId: job.variantId,
      workspaceId: job.workspaceId,
    });
    const dbAdmin = createDb(this.config.db.url, "app_admin");

    // Idempotency: skip if variant already terminal
    const [v0] = await dbAdmin
      .select()
      .from(generationVariants)
      .where(eq(generationVariants.id, job.variantId));
    if (
      !v0 ||
      v0.status === "completed" ||
      v0.status === "failed" ||
      v0.status === "failed_safety"
    ) {
      return;
    }

    // Mark running
    await dbAdmin
      .update(generationVariants)
      .set({ status: "running" })
      .where(eq(generationVariants.id, job.variantId));

    // Load generation context
    const gen = await getGenerationFull(
      createDb(this.config.db.url, "app_user"),
      job.workspaceId,
      job.generationId,
    );
    if (!gen) throw new Error("generation-not-found");

    const [brand] = gen.brandId
      ? await dbAdmin.select().from(brands).where(eq(brands.id, gen.brandId))
      : [null];
    const [tpl] = await dbAdmin
      .select()
      .from(templatesTable)
      .where(eq(templatesTable.id, v0.templateId));
    const mood = gen.moodId
      ? (await dbAdmin.select().from(moods).where(eq(moods.id, gen.moodId)))[0]
      : null;

    const settings = gen.settings as WorkerSettings;

    const commercial = settings.commercial;
    const selectedLogoIds = commercial?.brand_logo_asset_ids ?? [];
    let selectedLogoAssets: LogoAssetRow[] = [];
    let selectedLogoRefs: { s3Key: string; role: "brand_reference"; weight: number }[] = [];
    if (gen.brandId && (settings.flags?.useBrandLogo ?? true) && selectedLogoIds.length > 0) {
      selectedLogoAssets = await dbAdmin
        .select({
          s3Key: brandAssets.s3Key,
          mimeType: brandAssets.mimeType,
          width: brandAssets.width,
          height: brandAssets.height,
        })
        .from(brandAssets)
        .where(
          and(
            eq(brandAssets.workspaceId, job.workspaceId),
            eq(brandAssets.brandId, gen.brandId),
            eq(brandAssets.kind, "logo"),
            inArray(brandAssets.id, selectedLogoIds),
          ),
        );
      if (commercial?.mode !== "quick" && commercial?.mode !== "campaign_builder") {
        selectedLogoRefs = selectedLogoAssets.map((row) => ({
          s3Key: row.s3Key,
          role: "brand_reference" as const,
          weight: 0.95,
        }));
      }
    }

    // Brand grounding via embedding similarity. Logo assets are handled explicitly above.
    let brandRefs: { s3Key: string; role: "brand_reference"; weight: number }[] = [];
    if (gen.brandId)
      try {
        const { vector } = await this.adapters.ai.embedText(gen.brief);
        const r = await dbAdmin.execute<{ s3_key: string }>(sql`
        SELECT s3_key FROM brand_assets
        WHERE workspace_id = ${job.workspaceId} AND brand_id = ${gen.brandId} AND kind <> 'logo'
        ORDER BY embedding <=> ${sql.raw(`'[${vector.join(",")}]'`)}::vector
        LIMIT 3
      `);
        brandRefs = r.map((row) => ({
          s3Key: row.s3_key,
          role: "brand_reference" as const,
          weight: 0.4,
        }));
      } catch {
        // embeddings are best-effort
      }

    const influenceWeight =
      gen.inspirationInfluence === "subtle"
        ? 0.3
        : gen.inspirationInfluence === "strong"
          ? 0.9
          : 0.6;
    const inspirationRef = gen.inspirationImageS3Key
      ? parseInspirationKeys(gen.inspirationImageS3Key).map((s3Key) => ({
          s3Key,
          role: "inspiration" as const,
          weight: influenceWeight,
        }))
      : [];

    const target = resolveWorkerTarget(settings.output_target, commercial?.primary_output_target);
    const quickPrompt =
      commercial?.mode === "quick" || commercial?.mode === "campaign_builder"
        ? buildQuickCreatePrompt({
            normalized: buildQuickCreateNormalized({
              settings,
              commercial,
              brandId: gen.brandId,
              moodId: gen.moodId,
              brief: gen.brief,
            }),
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
            outputFormat: commercial.outputs?.formats[0] ?? target.format ?? target.aspectRatio,
          })
        : null;

    const promptParts = quickPrompt
      ? [quickPrompt.prompt]
      : buildLegacyPromptParts({
          brief: gen.brief,
          selectedLogoRefs,
          commercial,
          moodPromptModifiers: mood?.promptModifiers ?? null,
          hasTextSafeZones: Boolean(tpl?.textSafeZones),
        });
    if (quickPrompt && tpl?.textSafeZones) {
      promptParts.push(
        "Leave the indicated negative space visually quiet for renderer-owned text and logo overlays.",
      );
    }
    if (target.aspectRatio === "1.91:1") {
      promptParts.push(
        "Compose for a very wide 1.91:1 final output. Keep the full subject, product edges, and any important visual details inside the vertical center safe area with quiet margin at the top and bottom.",
      );
    }

    if (quickPrompt) {
      await persistQuickPromptMetadata(dbAdmin, job.generationId, settings, quickPrompt);
    }

    // Pre-flight moderation
    const mod = await this.adapters.ai.moderateText(promptParts.join("\n\n"));
    if (mod.flagged) {
      await this.markFailed(dbAdmin, job, "safety_blocked", mod.categories, "failed_safety");
      await this.releaseCredits(job, v0.creditCost);
      return;
    }

    if (!tpl) {
      await this.markFailed(dbAdmin, job, "template_not_found", null, "failed");
      await this.releaseCredits(job, v0.creditCost);
      return;
    }

    const openAIOnlyRealMode =
      this.config.ai.mode === "real" &&
      Boolean(this.config.ai.openaiKey) &&
      !this.config.ai.replicateToken &&
      !this.config.ai.recraftKey;
    const modelCode =
      settings.usePremiumModel || openAIOnlyRealMode
        ? this.config.ai.openaiImageModel
        : tpl.preferredModel;
    const negPrompt = combineNegativePrompts(
      quickPrompt?.negativePrompt,
      mood?.negativePrompts,
      quickPrompt ? undefined : NO_CROP_NEGATIVE_PROMPT,
    );
    const baseReq: AIImageRequest = {
      modelCode,
      prompt: promptParts.join("\n\n"),
      ...(negPrompt ? { negativePrompt: negPrompt } : {}),
      references: dedupeReferences([...selectedLogoRefs, ...brandRefs, ...inspirationRef]),
      aspectRatio: target.aspectRatio,
      width: target.width,
      height: target.height,
      safetyLevel: "default",
    };

    // Generate with retry, then provider fallback when that provider is configured.
    let imageRes;
    const providerStart = Date.now();
    try {
      imageRes = await this.adapters.ai.generateImage(baseReq);
    } catch (firstError) {
      try {
        imageRes = await this.adapters.ai.generateImage(baseReq);
      } catch (retryError) {
        if (openAIOnlyRealMode) {
          const error = retryError ?? firstError;
          this.adapters.telemetry.captureException(error, {
            variantId: job.variantId,
            stage: "image_generation",
            modelCode,
          });
          console.error("image generation provider error", error);
          await this.markFailed(dbAdmin, job, "model_failure", String(error), "failed");
          await this.releaseCredits(job, v0.creditCost);
          return;
        }

        try {
          const { references: _r, ...baseReqNoRefs } = baseReq;
          imageRes = await this.adapters.ai.generateImage({
            ...baseReqNoRefs,
            modelCode: "bedrock-sd35",
          });
        } catch (e2) {
          this.adapters.telemetry.captureException(retryError ?? e2, {
            variantId: job.variantId,
            stage: "image_generation",
            fallbackError: String(e2),
          });
          console.error("image generation provider error", retryError ?? e2);
          await this.markFailed(dbAdmin, job, "model_failure", String(retryError ?? e2), "failed");
          await this.releaseCredits(job, v0.creditCost);
          return;
        }
      }
    }
    this.adapters.telemetry.metric("provider.latency_ms", Date.now() - providerStart, {
      model: imageRes.modelUsedCode,
    });

    // Post-flight image moderation
    const imgMod = await this.adapters.ai.moderateImage(Buffer.from(imageRes.imageBytes));
    if (imgMod.flagged) {
      await this.markFailed(
        dbAdmin,
        job,
        "safety_blocked_image",
        imgMod.categories,
        "failed_safety",
      );
      await this.releaseCredits(job, v0.creditCost);
      return;
    }

    // Persist background
    const bgKey = keys.generationBackground(job.workspaceId, job.generationId, job.variantId);
    await this.adapters.storage.putBytes(bgKey, imageRes.imageBytes, "image/png");

    // Render template overlay
    const logoOverlay = await loadRendererLogo(this.adapters.storage, selectedLogoAssets[0]);
    const overlaySlots = quickPrompt?.overlaySlots;
    const renderSlots = {
      headline: overlaySlots?.headline ?? gen.brief,
      ...(overlaySlots?.subtitle ? { subhead: overlaySlots.subtitle } : {}),
      ...(overlaySlots?.cta ? { cta: overlaySlots.cta } : {}),
    };
    const rendered = await render(
      {
        templateJsxSource: tpl.jsxSource,
        background: { bytes: imageRes.imageBytes, mimeType: "image/png" },
        brand: {
          palette: (brand?.palette as never) ?? { primary: "#000" },
          fonts: (brand?.fonts as never) ?? {
            heading: { family: "Inter", weight: "700" },
            body: { family: "Inter", weight: "400" },
          },
          ...(logoOverlay ?? {}),
          flags: {
            useColors: settings.flags?.useBrandColors ?? true,
            useLogo: settings.flags?.useBrandLogo ?? true,
            useFonts: settings.flags?.useBrandFonts ?? true,
          },
        },
        ...(mood
          ? {
              mood: {
                accentPalette: mood.accentPalette ?? [],
                decorationTags: mood.decorationTags ?? [],
                ...(mood.typographyHint ? { typographyHint: mood.typographyHint } : {}),
                flags: {
                  useDecorations: settings.flags?.applyMoodDecorations ?? true,
                  useAccentColors: settings.flags?.applyMoodAccentColors ?? true,
                },
              },
            }
          : {}),
        slots: renderSlots,
        output: { width: target.width, height: target.height },
      },
      { requiresBrowser: tpl.requiresBrowserRender },
    );

    const outKey = keys.generationVariant(job.workspaceId, job.generationId, job.variantId);
    await this.adapters.storage.putBytes(outKey, rendered.pngBytes, "image/png");

    // Commit credits
    const ledger = new Ledger(dbAdmin, this.adapters.telemetry);
    await ledger.commit({
      workspaceId: job.workspaceId,
      amount: v0.creditCost,
      idempotencyKey: `commit-${job.variantId}`,
      generationId: job.generationId,
    });

    // Mark variant complete
    await dbAdmin
      .update(generationVariants)
      .set({
        status: "completed",
        outputS3Key: outKey,
        backgroundS3Key: bgKey,
        modelUsed: imageRes.modelUsedCode,
        renderMs: rendered.renderMs,
        completedAt: sql`now()`,
      })
      .where(eq(generationVariants.id, job.variantId));

    await this.fanInGeneration(dbAdmin, job.generationId);

    this.adapters.telemetry.metric("variant.duration_ms", Date.now() - start, {
      model: imageRes.modelUsedCode,
    });
    this.adapters.telemetry.metric("variant.completed", 1, { model: imageRes.modelUsedCode });
  }

  private async markFailed(
    dbAdmin: DbAdmin,
    job: VariantJob,
    reason: string,
    detail: unknown,
    status: "failed" | "failed_safety" = "failed",
  ) {
    await dbAdmin
      .update(generationVariants)
      .set({ status, errorPayload: { reason, detail }, completedAt: sql`now()` })
      .where(eq(generationVariants.id, job.variantId));
    await this.fanInGeneration(dbAdmin, job.generationId);
  }

  private async fanInGeneration(dbAdmin: DbAdmin, generationId: string) {
    await dbAdmin.execute(sql`
      UPDATE generations
      SET
        status = CASE
          WHEN EXISTS (
            SELECT 1 FROM generation_variants
            WHERE generation_id = ${generationId}
              AND status = 'completed'
          )
          THEN 'completed'
          ELSE 'failed'
        END,
        completed_at = now()
      WHERE id = ${generationId}
        AND NOT EXISTS (
          SELECT 1 FROM generation_variants
          WHERE generation_id = ${generationId}
            AND status NOT IN ('completed', 'failed', 'failed_safety')
        )
    `);
  }

  private async releaseCredits(job: VariantJob, amount: number) {
    const dbAdmin = createDb(this.config.db.url, "app_admin");
    const ledger = new Ledger(dbAdmin, this.adapters.telemetry);
    await ledger.release({
      workspaceId: job.workspaceId,
      amount,
      idempotencyKey: `release-${job.variantId}`,
      generationId: job.generationId,
    });
  }
}
