import { randomUUID } from "node:crypto";

import { Ledger, InsufficientCredits } from "@layertone/billing";
import {
  and,
  captionJobs,
  createDb,
  desc,
  eq,
  generations,
  generationVariants,
  listAvailableMoods,
  pickTemplates,
  insertGeneration,
  insertVariants,
  getGenerationFull,
  getProduct,
  updateGenerationInspirationKey,
  priceBookLookup,
} from "@layertone/db";
import { tagSpan } from "@layertone/observability";
import {
  AppError,
  CODES,
  commercialSettingsSnapshot,
  normalizeCommercialGenerationInput,
  resolveOutputTarget,
  assertMoodSupportsOutputAspectRatio,
} from "@layertone/shared";
import type { Adapters, Config } from "@layertone/shared";
import { keys } from "@layertone/storage";

import { assertBriefAllowed } from "./aup";
import { assertWorkspaceCanGenerate } from "./workspace-status";

const VARIANT_COUNT = 4;
const EXTRA_IMAGE_CREDITS = 2;

export class GenerationApi {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  private db(role: "app_user" | "app_admin" = "app_user") {
    return createDb(this.config.db.url, role);
  }

  async estimate(args: { workspaceId: string; input: unknown }) {
    const v = normalizeCommercialGenerationInput(args.input);
    const plan = await this.buildPlan(v);
    return {
      credits: plan.totalCredits,
      priceBookVersion: plan.priceBookVersion,
      target: plan.target,
      variants: plan.variantPlan.length,
      lineItems: plan.lineItems,
    };
  }

  async create(args: { workspaceId: string; userId: string; input: unknown }) {
    const v = normalizeCommercialGenerationInput(args.input);
    const plan = await this.buildPlan(v);
    v.productRefs = await this.snapshotProductRefs(args.workspaceId, v.productRefs);

    const adminDb = this.db("app_admin");
    await assertWorkspaceCanGenerate(adminDb, args.workspaceId);
    await assertBriefAllowed(adminDb, {
      brief: v.brief,
      workspaceId: args.workspaceId,
      userId: args.userId,
    });

    // Reserve credits
    const ledger = new Ledger(adminDb, this.adapters.telemetry);
    const reservationKey = `gen-reserve-${args.workspaceId}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    try {
      await ledger.reserve({
        workspaceId: args.workspaceId,
        amount: plan.totalCredits,
        idempotencyKey: reservationKey,
      });
    } catch (e) {
      if (e instanceof InsufficientCredits) {
        throw new AppError(
          CODES.BILLING_INSUFFICIENT_CREDITS,
          "You don't have enough credits. Top up to continue.",
          402,
          { balance: e.balance, requested: e.requested },
        );
      }
      throw e;
    }

    // Insert generation row
    const genId = randomUUID();
    await insertGeneration(this.db(), args.workspaceId, {
      id: genId,
      workspaceId: args.workspaceId,
      brandId: v.brandId ?? null,
      projectId: v.projectId,
      moodId: v.moodId ?? null,
      brief: v.brief,
      settings: {
        ...v.flags,
        flags: v.flags,
        output_target: plan.target,
        variant_count: plan.variantPlan.length,
        commercial: commercialSettingsSnapshot(v, plan.target),
      },
      inspirationImageS3Key: null,
      inspirationInfluence: v.inspirationInfluence ?? null,
      priceBookVersion: plan.priceBookVersion,
      requestedByUserId: args.userId,
    });

    // Claim inspiration uploads if present
    if (v.inspirationUploadIds.length > 0) {
      const finalKeys: string[] = [];
      for (let i = 0; i < v.inspirationUploadIds.length; i++) {
        const uploadId = v.inspirationUploadIds[i]!;
        const staging = keys.inspirationUploadStaging(args.workspaceId, uploadId, "png");
        const final = keys.inspirationClaimedIdx(args.workspaceId, genId, i, "png");
        await this.adapters.storage.copy(staging, final);
        await this.adapters.storage.delete(staging);
        finalKeys.push(final);
      }
      // Store as JSON array (single image stored as array too, for uniform parsing)
      await updateGenerationInspirationKey(
        this.db("app_admin"),
        genId,
        JSON.stringify(finalKeys),
      );
    }

    // Insert variants
    const variantRows = plan.variantPlan.map((vp) => ({
      id: randomUUID(),
      generationId: genId,
      templateId: vp.templateId,
      modelUsed: vp.modelCode,
      creditCost: vp.credits,
    }));
    await insertVariants(this.db(), args.workspaceId, variantRows);

    // Enqueue SQS messages
    try {
      for (const row of variantRows) {
        await this.adapters.queue.send(
          this.config.queue.generationsQueue,
          { generationId: genId, variantId: row.id, workspaceId: args.workspaceId },
          { idempotencyKey: row.id },
        );
      }
    } catch (e) {
      await this.markGenerationFailedAfterEnqueueError({
        generationId: genId,
        variantIds: variantRows.map((row) => row.id),
        error: e,
      });
      await ledger.release({
        workspaceId: args.workspaceId,
        amount: plan.totalCredits,
        idempotencyKey: `gen-release-enqueue-${genId}`,
        generationId: genId,
      });
      throw e;
    }

    tagSpan("generation.create", {
      workspaceId: args.workspaceId,
      generationId: genId,
      variants: variantRows.length,
    });
    this.adapters.telemetry.metric("generation.created", 1, {
      hasInspiration: v.inspirationUploadIds.length > 0 ? "true" : "false",
    });
    this.adapters.telemetry.metric("generation.variants", variantRows.length);
    this.adapters.telemetry.metric("generation.credits_reserved", plan.totalCredits);

    return {
      generationId: genId,
      status: "pending" as const,
      variants: variantRows.map((r) => ({
        id: r.id,
        templateId: r.templateId,
        status: "queued" as const,
      })),
      reservedCredits: plan.totalCredits,
    };
  }

  async get(args: { workspaceId: string; generationId: string }) {
    const gen = await getGenerationFull(this.db(), args.workspaceId, args.generationId);
    if (!gen) return null;
    const variants = await Promise.all(
      gen.variants.map(async (v) => ({
        ...v,
        url: v.outputS3Key ? await this.adapters.storage.getSignedUrl(v.outputS3Key) : null,
      })),
    );
    const captions = await this.db("app_admin")
      .select()
      .from(captionJobs)
      .where(
        and(
          eq(captionJobs.workspaceId, args.workspaceId),
          eq(captionJobs.generationId, args.generationId),
        ),
      )
      .orderBy(desc(captionJobs.createdAt));
    return { ...gen, variants, captions };
  }

  private async markGenerationFailedAfterEnqueueError(args: {
    generationId: string;
    variantIds: string[];
    error: unknown;
  }) {
    const errorPayload = {
      reason: "queue_enqueue_failed",
      message: args.error instanceof Error ? args.error.message : String(args.error),
    };
    const adminDb = this.db("app_admin");
    await adminDb
      .update(generations)
      .set({ status: "failed", completedAt: new Date(), errorPayload })
      .where(eq(generations.id, args.generationId));

    for (const variantId of args.variantIds) {
      await adminDb
        .update(generationVariants)
        .set({ status: "failed", completedAt: new Date(), errorPayload })
        .where(eq(generationVariants.id, variantId));
    }
  }

  private async buildPlan(v: ReturnType<typeof normalizeCommercialGenerationInput>) {
    const target = resolveOutputTarget(v.outputTarget);

    if (v.moodId) {
      const moods = await listAvailableMoods(this.db(), {
        aspectRatio: target.aspectRatio,
      });
      const m = moods.find((x) => x.id === v.moodId);
      if (!m) {
        throw new AppError(
          CODES.VALIDATION_MOOD_ASPECT_MISMATCH,
          "This mood doesn't support that output size. Pick another mood or change the output.",
          400,
        );
      }
      assertMoodSupportsOutputAspectRatio(m.supportedAspectRatios, target.aspectRatio);
    }

    const requestedVariants = Math.min(v.outputs.variants || VARIANT_COUNT, VARIANT_COUNT);
    const useImageOnlyTemplate =
      v.mode === "quick" &&
      !v.moodId &&
      v.productRefs.length === 0 &&
      !hasCommercialCampaignDetails(v.campaign);
    const tpls = await pickTemplates(this.db(), {
      moodId: v.moodId ?? null,
      aspectRatio: target.aspectRatio,
      n: requestedVariants,
      ...(useImageOnlyTemplate ? { preferredSlug: "quick-create-image-only" } : {}),
    });
    if (tpls.length === 0) {
      throw new AppError(
        CODES.VALIDATION_NO_TEMPLATE,
        "No matching template was found for your settings.",
        404,
      );
    }
    const selectedTemplates = Array.from(
      { length: requestedVariants },
      (_, index) => tpls[index % tpls.length]!,
    );

    const sizeBucket: "standard" | "large" =
      target.width * target.height > 1280 * 1280 ? "large" : "standard";
    const hasInspiration = v.inspirationUploadIds.length > 0;
    const extraImageCredits = Math.max(0, v.inspirationUploadIds.length - 1) * EXTRA_IMAGE_CREDITS;
    let priceBookVersion = 0;
    let totalCredits = 0;
    const variantPlan: { templateId: string; modelCode: string; credits: number }[] = [];
    const lineItems: { label: string; credits: number }[] = [];

    const openAIOnlyRealMode =
      this.config.ai.mode === "real" &&
      Boolean(this.config.ai.openaiKey) &&
      !this.config.ai.replicateToken &&
      !this.config.ai.recraftKey;

    for (const [index, t] of selectedTemplates.entries()) {
      const modelCode =
        v.flags.usePremiumModel || openAIOnlyRealMode ? this.config.ai.openaiImageModel : t.preferredModel;
      const p = await priceBookLookup(this.db(), {
        modelCode,
        sizeBucket,
        premiumFlag: v.flags.usePremiumModel,
        hasInspirationFlag: hasInspiration,
      });
      priceBookVersion = p.version;
      const variantCredits = creditsFromPricebook(p) + extraImageCredits;
      totalCredits += variantCredits;
      variantPlan.push({ templateId: t.tid, modelCode, credits: variantCredits });
      lineItems.push({
        label: `Sample ${index + 1} · ${t.slug ?? "template"} · ${modelCode}`,
        credits: variantCredits,
      });
    }

    return { target, totalCredits, priceBookVersion, variantPlan, lineItems };
  }

  private async snapshotProductRefs(
    workspaceId: string,
    refs: ReturnType<typeof normalizeCommercialGenerationInput>["productRefs"],
  ) {
    return Promise.all(
      refs.map(async (ref) => {
        if (!ref.productId) return ref;
        const product = await getProduct(this.db(), workspaceId, ref.productId);
        if (!product) return ref;
        return {
          ...ref,
          commercialFields: {
            name: product.name,
            ...(product.title ? { title: product.title } : {}),
            ...(product.subtitle ? { subtitle: product.subtitle } : {}),
            ...(product.description ? { description: product.description } : {}),
            ...(product.brandLabel ? { brandLabel: product.brandLabel } : {}),
            ...(product.model ? { model: product.model } : {}),
            ...(product.sku ? { sku: product.sku } : {}),
            ...(product.category ? { category: product.category } : {}),
            ...(product.priceMinor !== null ? { priceMinor: product.priceMinor } : {}),
            ...(product.compareAtPriceMinor !== null
              ? { compareAtPriceMinor: product.compareAtPriceMinor }
              : {}),
            currency: product.currency,
            ...(product.discountText ? { discountText: product.discountText } : {}),
            keyFeatures: product.keyFeatures,
            benefits: product.benefits,
            ...(product.targetAudience ? { targetAudience: product.targetAudience } : {}),
            ...ref.commercialFields,
          },
        };
      }),
    );
  }

  async regenerateVariant(args: {
    workspaceId: string;
    userId: string;
    generationId: string;
    variantId: string;
  }) {
    const adminDb = this.db("app_admin");
    await assertWorkspaceCanGenerate(adminDb, args.workspaceId);

    const gen = await getGenerationFull(this.db(), args.workspaceId, args.generationId);
    if (!gen) {
      throw new AppError(CODES.GENERATION_NOT_FOUND, "Generation not found.", 404);
    }

    const sourceVariant = gen.variants.find((x) => x.id === args.variantId);
    if (!sourceVariant) {
      throw new AppError(CODES.GENERATION_VARIANT_NOT_FOUND, "Variant not found.", 404);
    }

    const settings = gen.settings as {
      output_target: { aspectRatio: string; width: number; height: number };
      usePremiumModel?: boolean;
    };
    const target = settings.output_target;

    const sizeBucket: "standard" | "large" =
      target.width * target.height > 1280 * 1280 ? "large" : "standard";
    const hasInspiration = !!gen.inspirationImageS3Key;

    const modelCode = sourceVariant.modelUsed ?? "flux-1.1-pro";
    const price = await priceBookLookup(this.db(), {
      modelCode,
      sizeBucket,
      premiumFlag: !!settings.usePremiumModel,
      hasInspirationFlag: hasInspiration,
    });

    const ledger = new Ledger(adminDb, this.adapters.telemetry);
    const newVariantId = randomUUID();
    const reservationKey = `regen-reserve-${newVariantId}`;

    try {
      await ledger.reserve({
        workspaceId: args.workspaceId,
        amount: price.credits,
        idempotencyKey: reservationKey,
        generationId: args.generationId,
      });
    } catch (e) {
      if (e instanceof InsufficientCredits) {
        throw new AppError(
          CODES.BILLING_INSUFFICIENT_CREDITS,
          "You don't have enough credits to regenerate this variant.",
          402,
          { balance: e.balance, requested: e.requested },
        );
      }
      throw e;
    }

    const [inserted] = await insertVariants(this.db(), args.workspaceId, [
      {
        id: newVariantId,
        generationId: args.generationId,
        templateId: sourceVariant.templateId,
        modelUsed: modelCode,
        creditCost: price.credits,
      },
    ]);

    // Re-open the parent generation if it had completed (so fan-in completion logic in worker re-evaluates)
    await adminDb
      .update(generations)
      .set({ status: "running", completedAt: null })
      .where(
        and(eq(generations.id, args.generationId), eq(generations.workspaceId, args.workspaceId)),
      );

    await this.adapters.queue.send(
      this.config.queue.generationsQueue,
      {
        generationId: args.generationId,
        variantId: newVariantId,
        workspaceId: args.workspaceId,
      },
      { idempotencyKey: newVariantId },
    );

    tagSpan("generation.regenerate_variant", {
      workspaceId: args.workspaceId,
      generationId: args.generationId,
      variantId: newVariantId,
    });
    this.adapters.telemetry.metric("generation.regenerated", 1, { model: modelCode });

    return {
      generationId: args.generationId,
      variant: {
        id: inserted!.id,
        templateId: sourceVariant.templateId,
        status: "queued" as const,
      },
      reservedCredits: price.credits,
    };
  }
}

function creditsFromPricebook(price: { credits?: number; creditCost?: number }) {
  return price.credits ?? price.creditCost ?? 0;
}

function hasCommercialCampaignDetails(campaign: Record<string, unknown>) {
  return Object.values(campaign).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}
