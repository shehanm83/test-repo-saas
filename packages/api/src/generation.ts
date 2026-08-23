import { randomUUID } from "node:crypto";

import {
  billingSegmentFor,
  InsufficientCredits,
  Ledger,
  priceCreditsForPlan,
} from "@layertone/billing";
import {
  and,
  captionJobs,
  createDb,
  desc,
  eq,
  generations,
  generationVariants,
  inArray,
  listAvailableMoods,
  listApprovedMoodAssets,
  listProductIdentityAssets,
  pickTemplates,
  insertGeneration,
  insertVariants,
  getGenerationFull,
  getProduct,
  getStockById,
  updateGenerationInspirationKey,
  priceBookLookup,
  workspaces,
  brandAssets,
} from "@layertone/db";
import { tagSpan } from "@layertone/observability";
import {
  AppError,
  CODES,
  commercialSettingsSnapshot,
  normalizeCommercialGenerationInput,
  resolveOutputTarget,
  assertMoodSupportsOutputAspectRatio,
  type QuickCreateAssetSnapshot,
  type VariantSpec,
  isQuickCreateV2Enabled,
} from "@layertone/shared";
import type { Adapters, Config } from "@layertone/shared";
import { keys } from "@layertone/storage";

import { assertBriefAllowed } from "./aup";
import { assertWorkspaceCanGenerate } from "./workspace-status";
import { QuickCreatePlanner } from "./quick-create-planner";

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
    const workspacePlanCode = await this.getWorkspacePlanCode(args.workspaceId);
    this.assertEntitlements(v, workspacePlanCode);
    const plan = await this.buildPlan(v, workspacePlanCode, [], args.workspaceId);
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
    const workspacePlanCode = await this.getWorkspacePlanCode(args.workspaceId);
    this.assertEntitlements(v, workspacePlanCode);
    v.productRefs = await this.snapshotProductRefs(args.workspaceId, v.productRefs);
    const useV2 =
      v.mode === "quick" && isQuickCreateV2Enabled(this.config, args.workspaceId);
    if (useV2) await this.assertUploadsClaimable(args.workspaceId, v);

    if (useV2 && !v.creativePlan) {
      const raw =
        args.input && typeof args.input === "object" ? (args.input as Record<string, unknown>) : {};
      const exactCopy = Object.fromEntries(
        Object.entries(v.campaign).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string" && entry[1].trim().length > 0,
        ),
      );
      v.creativePlan = await new QuickCreatePlanner(this.config, this.adapters).plan({
        workspaceId: args.workspaceId,
        input: {
          request: typeof raw.brief === "string" && raw.brief.trim() ? raw.brief : v.brief,
          brandId: v.brandId,
          productIds: v.productRefs.flatMap((ref) => (ref.productId ? [ref.productId] : [])),
          attachmentUploadIds: v.inspirationUploadIds,
          outputTarget: v.outputTarget,
          sampleCount: v.outputs.variants,
          selectedMoodId: v.moodId,
          moodInfluence: v.inspirationInfluence ?? "balanced",
          exactCopy,
        },
      });
    }

    const genId = randomUUID();
    const typedAssets = useV2 ? await this.snapshotTypedAssets(args.workspaceId, genId, v) : [];
    const plan = await this.buildPlan(v, workspacePlanCode, typedAssets, args.workspaceId);

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
        typed_assets: typedAssets,
        creative_plan: v.creativePlan ?? null,
      },
      inspirationImageS3Key: null,
      inspirationInfluence: v.inspirationInfluence ?? null,
      priceBookVersion: plan.priceBookVersion,
      requestedByUserId: args.userId,
    });

    // Claim inspiration uploads if present
    try {
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
        if (v.mode === "legacy") {
          await updateGenerationInspirationKey(
            this.db("app_admin"),
            genId,
            JSON.stringify(finalKeys),
          );
        }
      }
    } catch (error) {
      await adminDb
        .update(generations)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorPayload: { reason: "upload_claim_failed", message: String(error) },
        })
        .where(eq(generations.id, genId));
      await ledger.release({
        workspaceId: args.workspaceId,
        amount: plan.totalCredits,
        idempotencyKey: `gen-release-upload-${genId}`,
        generationId: genId,
      });
      throw new AppError(
        CODES.VALIDATION_FAILED,
        "A required upload could not be claimed. Upload it again before generating.",
        400,
      );
    }

    // Insert variants
    const variantRows = plan.variantPlan.map((vp, index) => ({
      id: randomUUID(),
      generationId: genId,
      templateId: vp.templateId,
      modelUsed: vp.modelCode,
      creditCost: vp.credits,
      variantSpec: v.creativePlan?.variants[index] ?? null,
      seed: v.creativePlan?.variants[index]?.seed ?? null,
      referenceSnapshots: referencesForVariant(
        typedAssets,
        v.creativePlan?.variants[index] ?? null,
      ),
      qaStatus: useV2 ? ("pending" as const) : ("unavailable" as const),
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
    variants.sort((left, right) => {
      const statusWeight = (status: typeof left.qaStatus) =>
        status === "passed" ? 3 : status === "soft_failed" ? 2 : status === "hard_failed" ? 0 : 1;
      return (
        statusWeight(right.qaStatus) - statusWeight(left.qaStatus) ||
        (right.qaRank ?? -1) - (left.qaRank ?? -1) ||
        left.createdAt.getTime() - right.createdAt.getTime()
      );
    });
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

  private async getWorkspacePlanCode(workspaceId: string) {
    const [workspace] = await this.db("app_admin")
      .select({ planCode: workspaces.planCode })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return workspace?.planCode ?? "free";
  }

  private assertEntitlements(
    v: ReturnType<typeof normalizeCommercialGenerationInput>,
    planCode: string,
  ) {
    const segment = billingSegmentFor(planCode);
    if (segment !== "free") return;

    if (v.moodId) {
      throw new AppError(
        CODES.VALIDATION_FAILED,
        "Moods are not available on the Free plan. Upgrade or buy credits to use moods.",
        403,
        { entitlement: "moods" },
      );
    }

    if (v.flags.usePremiumModel || v.outputs.quality === "premium") {
      throw new AppError(
        CODES.VALIDATION_FAILED,
        "Premium image models are not available on the Free plan.",
        403,
        { entitlement: "premium_generation" },
      );
    }

    if (v.projectId) {
      throw new AppError(
        CODES.VALIDATION_FAILED,
        "Saved projects are not available on the Free plan.",
        403,
        { entitlement: "saved_projects" },
      );
    }
  }

  private async buildPlan(
    v: ReturnType<typeof normalizeCommercialGenerationInput>,
    planCode: string,
    typedAssets: QuickCreateAssetSnapshot[] = [],
    workspaceId?: string,
  ) {
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
    const requiredSlots = exactOverlaySlots(v);
    const tpls = await pickTemplates(this.db(), {
      moodId: v.moodId ?? null,
      aspectRatio: target.aspectRatio,
      n: requestedVariants,
      ...(useImageOnlyTemplate ? { preferredSlug: "quick-create-image-only" } : {}),
      ...(v.mode === "quick" && isQuickCreateV2Enabled(this.config, workspaceId)
        ? {
            ...(v.template.templateId ? { templateId: v.template.templateId } : {}),
            family: v.template.family,
            layout: v.template.layout,
            requiredSlots,
          }
        : {}),
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
      const hasEssentialIdentity =
        typedAssets.some(
          (asset) => asset.role === "product_identity" && asset.importance === "essential",
        ) || v.productRefs.length > 0;
      if (hasEssentialIdentity && this.config.ai.mode === "real" && !this.config.ai.openaiKey) {
        throw new AppError(
          CODES.GENERATION_MODEL_UNAVAILABLE,
          "The selected product needs an identity-capable image provider, but none is configured.",
          409,
        );
      }
      const maxVariantReferenceCount = v.creativePlan?.variants.length
        ? Math.max(
            ...v.creativePlan.variants.map(
              (spec) => referencesForVariant(typedAssets, spec).length,
            ),
          )
        : typedAssets.filter((asset) => !asset.role.endsWith("_overlay")).length;
      if (maxVariantReferenceCount > 16) {
        throw new AppError(
          CODES.GENERATION_MODEL_UNAVAILABLE,
          "This request has more references per variant than the configured providers can preserve.",
          400,
        );
      }
      const modelCode =
        hasEssentialIdentity || v.flags.usePremiumModel || openAIOnlyRealMode
          ? this.config.ai.openaiImageModel
          : t.preferredModel;
      const p = await priceBookLookup(this.db(), {
        modelCode,
        sizeBucket,
        premiumFlag: v.flags.usePremiumModel,
        hasInspirationFlag: hasInspiration,
      });
      priceBookVersion = p.version;
      const baseCredits = creditsFromPricebook(p) + extraImageCredits;
      const variantCredits = priceCreditsForPlan(baseCredits, planCode);
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
        const [product, assets] = await Promise.all([
          getProduct(this.db(), workspaceId, ref.productId),
          listProductIdentityAssets(this.db(), workspaceId, ref.productId),
        ]);
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
          assetSnapshots: assets.slice(0, 4).map((asset) => ({
            id: asset.id,
            s3Key: asset.s3Key,
            mimeType: asset.mimeType,
            kind: asset.kind,
          })),
        };
      }),
    );
  }

  private async assertUploadsClaimable(
    workspaceId: string,
    v: ReturnType<typeof normalizeCommercialGenerationInput>,
  ) {
    for (const uploadId of v.inspirationUploadIds) {
      const staging = keys.inspirationUploadStaging(workspaceId, uploadId, "png");
      if (!(await this.adapters.storage.exists(staging))) {
        throw new AppError(
          CODES.VALIDATION_FAILED,
          "A required image upload is missing or has not finished. Upload it again before generating.",
          400,
          { uploadId },
        );
      }
    }
  }

  private async snapshotTypedAssets(
    workspaceId: string,
    generationId: string,
    v: ReturnType<typeof normalizeCommercialGenerationInput>,
  ): Promise<QuickCreateAssetSnapshot[]> {
    const assets: QuickCreateAssetSnapshot[] = [];
    for (const ref of v.productRefs) {
      if (ref.productId && !ref.assetSnapshots?.length) {
        throw new AppError(
          CODES.VALIDATION_FAILED,
          "The selected saved product has no usable product image. Add a cutout, product, or packaging asset first.",
          400,
          { productId: ref.productId },
        );
      }
      for (const asset of ref.assetSnapshots ?? []) {
        assets.push({
          id: `product:${asset.id}`,
          sourceAssetId: asset.id,
          ...(ref.productId ? { productId: ref.productId } : {}),
          role: "product_identity",
          s3Key: asset.s3Key,
          mimeType: asset.mimeType,
          importance: "essential",
          locked: true,
          weight: 1,
          providerOrder: assets.length,
          purpose: asset.kind,
        });
      }
    }
    const productUploadIds = new Set(
      v.productRefs.flatMap((ref) => (ref.uploadId ? [ref.uploadId] : [])),
    );
    for (const [index, uploadId] of v.inspirationUploadIds.entries()) {
      const isProductIdentity = productUploadIds.has(uploadId);
      assets.push({
        id: `upload:${uploadId}`,
        role: isProductIdentity ? "product_identity" : "composition_reference",
        s3Key: keys.inspirationClaimedIdx(workspaceId, generationId, index, "png"),
        mimeType: "image/png",
        importance: isProductIdentity ? "essential" : "supporting",
        locked: isProductIdentity,
        weight:
          v.inspirationInfluence === "strong"
            ? 0.9
            : v.inspirationInfluence === "subtle"
              ? 0.3
              : 0.65,
        providerOrder: assets.length,
        purpose: isProductIdentity ? "Uploaded product identity" : "User visual reference",
      });
    }
    if (v.brandId && v.flags.useBrandLogo) {
      const logoQuery = this.db("app_admin").select().from(brandAssets);
      const logos = v.brandLogoAssetIds.length
        ? await logoQuery.where(
            and(
              eq(brandAssets.workspaceId, workspaceId),
              eq(brandAssets.brandId, v.brandId),
              eq(brandAssets.kind, "logo"),
              inArray(brandAssets.id, v.brandLogoAssetIds),
            ),
          )
        : await logoQuery
            .where(
              and(
                eq(brandAssets.workspaceId, workspaceId),
                eq(brandAssets.brandId, v.brandId),
                eq(brandAssets.kind, "logo"),
                eq(brandAssets.isPrimary, true),
              ),
            )
            .limit(1);
      if (v.brandLogoAssetIds.length > 0 && logos.length !== new Set(v.brandLogoAssetIds).size) {
        throw new AppError(
          CODES.VALIDATION_FAILED,
          "A selected logo is missing or does not belong to this brand.",
          400,
        );
      }
      for (const logo of logos) {
        assets.push({
          id: `logo:${logo.id}`,
          sourceAssetId: logo.id,
          role: "logo_overlay",
          s3Key: logo.s3Key,
          mimeType: logo.mimeType,
          importance: "essential",
          locked: true,
          weight: 1,
          providerOrder: assets.length,
          purpose: "Exact renderer-owned logo",
        });
      }
    }
    if (v.stockAssetId) {
      const stock = await getStockById(this.db("app_admin"), v.stockAssetId);
      if (!stock) {
        throw new AppError(
          CODES.VALIDATION_FAILED,
          "The selected certification mark is unavailable.",
          400,
        );
      }
      assets.push({
        id: `certification:${stock.id}`,
        sourceAssetId: stock.id,
        role: "certification_overlay",
        s3Key: stock.s3Key,
        mimeType: stock.mimeType,
        importance: "essential",
        locked: true,
        weight: 1,
        providerOrder: assets.length,
        purpose: stock.label,
      });
    }
    const moodIds = new Set([
      ...(v.moodId ? [v.moodId] : []),
      ...(v.creativePlan?.variants.flatMap((variant) =>
        variant.moodRecipe ? [variant.moodRecipe.id] : [],
      ) ?? []),
    ]);
    for (const moodId of moodIds) {
      const curatedMoodAssets = await listApprovedMoodAssets(this.db(), moodId);
      for (const moodAsset of curatedMoodAssets) {
        assets.push({
          id: `mood:${moodAsset.id}`,
          sourceAssetId: moodAsset.id,
          role: "style_reference",
          s3Key: moodAsset.s3Key,
          mimeType: moodAsset.mimeType,
          importance: "supporting",
          locked: v.creativePlan?.variants[0]?.locks.mood ?? true,
          weight: moodAsset.weight / 100,
          providerOrder: assets.length,
          purpose: `mood:${moodId}:${moodAsset.purpose}`,
        });
      }
    }
    if (v.campaign.qrUrl) {
      assets.push({
        id: `qr:${generationId}`,
        role: "qr_overlay",
        s3Key: `inline:qr:${encodeURIComponent(v.campaign.qrUrl)}`,
        mimeType: "application/x-qr-payload",
        importance: "essential",
        locked: true,
        weight: 1,
        providerOrder: assets.length,
        purpose: v.campaign.qrUrl,
      });
    }
    return assets;
  }

  async regenerateVariant(args: {
    workspaceId: string;
    userId: string;
    generationId: string;
    variantId: string;
    refinement?: {
      instruction: string;
      locks: Array<"product" | "composition" | "brand" | "copy" | "mood">;
      treatmentVariantId?: string | null;
      moodId?: string | null;
    };
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
    const treatmentVariant = args.refinement?.treatmentVariantId
      ? gen.variants.find((variant) => variant.id === args.refinement?.treatmentVariantId)
      : null;
    if (args.refinement?.treatmentVariantId && !treatmentVariant) {
      throw new AppError(
        CODES.GENERATION_VARIANT_NOT_FOUND,
        "The visual-treatment result was not found.",
        404,
      );
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
    const workspacePlanCode = await this.getWorkspacePlanCode(args.workspaceId);
    const price = await priceBookLookup(this.db(), {
      modelCode,
      sizeBucket,
      premiumFlag: !!settings.usePremiumModel,
      hasInspirationFlag: hasInspiration,
    });
    const creditCost = priceCreditsForPlan(price.credits, workspacePlanCode);

    const ledger = new Ledger(adminDb, this.adapters.telemetry);
    const newVariantId = randomUUID();
    const reservationKey = `regen-reserve-${newVariantId}`;

    try {
      await ledger.reserve({
        workspaceId: args.workspaceId,
        amount: creditCost,
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

    const regeneratedSeed = Math.floor(Math.random() * 2_147_483_647);
    const [inserted] = await insertVariants(this.db(), args.workspaceId, [
      {
        id: newVariantId,
        generationId: args.generationId,
        templateId: sourceVariant.templateId,
        modelUsed: modelCode,
        creditCost,
        parentVariantId: sourceVariant.id,
        refinementSpec: args.refinement ?? { instruction: "Create another variation", locks: [] },
        variantSpec: buildRegeneratedVariantSpec({
          source: sourceVariant.variantSpec as VariantSpec | null,
          ...(treatmentVariant
            ? { treatment: treatmentVariant.variantSpec as VariantSpec | null }
            : {}),
          generationId: args.generationId,
          parentVariantId: sourceVariant.id,
          index: gen.variants.length,
          seed: regeneratedSeed,
          ...(args.refinement ? { refinement: args.refinement } : {}),
        }),
        seed: regeneratedSeed,
        referenceSnapshots:
          args.refinement && explicitlyChangesMood(args.refinement.instruction) && !args.refinement.locks.includes("mood")
            ? ((sourceVariant.referenceSnapshots as QuickCreateAssetSnapshot[] | null) ?? []).filter(
                (asset) => !asset.purpose?.startsWith("mood:"),
              )
            : sourceVariant.referenceSnapshots,
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
    if (args.refinement) {
      this.adapters.telemetry.metric("generation.refined", 1, {
        locks: args.refinement.locks.join(",") || "none",
        moodOnly:
          args.refinement.locks.includes("product") &&
          args.refinement.locks.includes("composition") &&
          args.refinement.locks.includes("brand") &&
          args.refinement.locks.includes("copy")
            ? "true"
            : "false",
      });
    }

    return {
      generationId: args.generationId,
      variant: {
        id: inserted!.id,
        templateId: sourceVariant.templateId,
        status: "queued" as const,
      },
      reservedCredits: creditCost,
    };
  }
}

function buildRegeneratedVariantSpec(args: {
  source: VariantSpec | null;
  treatment?: VariantSpec | null;
  generationId: string;
  parentVariantId: string;
  index: number;
  seed: number;
  refinement?: {
    instruction: string;
    locks: Array<"product" | "composition" | "brand" | "copy" | "mood">;
    moodId?: string | null;
  };
}): VariantSpec | null {
  if (!args.source) return null;
  const refinement = args.refinement;
  const locks = new Set(refinement?.locks ?? []);
  const treatment = args.treatment;
  const instruction = refinement?.instruction.trim() || "Create another variation";
  return {
    ...args.source,
    index: args.index,
    label: refinement ? `Refined · ${args.source.label}`.slice(0, 100) : `Variation · ${args.source.label}`.slice(0, 100),
    concept: `${args.source.concept}\nRequested change: ${instruction}`.slice(0, 600),
    composition: locks.has("composition")
      ? args.source.composition
      : treatment?.composition ?? args.source.composition,
    camera: locks.has("composition") ? args.source.camera : treatment?.camera ?? args.source.camera,
    lighting: treatment?.lighting ?? args.source.lighting,
    artDirection: treatment?.artDirection ?? args.source.artDirection,
    seed: args.seed,
    ancestry: {
      parentGenerationId: args.generationId,
      parentVariantId: args.parentVariantId,
      changeRequest: instruction,
    },
    locks: {
      identity: locks.has("product") || args.source.locks.identity,
      claims: locks.has("copy") || args.source.locks.claims,
      exactCopy: locks.has("copy") || args.source.locks.exactCopy,
      brand: locks.has("brand") || args.source.locks.brand,
      mood: locks.has("mood"),
    },
    moodRecipe:
      refinement && explicitlyChangesMood(instruction) && !locks.has("mood")
        ? null
        : args.source.moodRecipe,
  };
}

function explicitlyChangesMood(instruction: string) {
  return /\b(?:switch|change|replace|remove|drop|use)\b.{0,48}\b(?:mood|style|visual direction)\b/i.test(
    instruction,
  );
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

function exactOverlaySlots(v: ReturnType<typeof normalizeCommercialGenerationInput>) {
  const slots: string[] = [];
  const mapping: Array<[keyof typeof v.campaign, string]> = [
    ["title", "headline"],
    ["subtitle", "subtitle"],
    ["price", "price"],
    ["discount", "discount"],
    ["badgeText", "badgeText"],
    ["cta", "cta"],
    ["offerExpiry", "offerExpiry"],
    ["legalText", "legalText"],
    ["website", "website"],
    ["phone", "phone"],
    ["qrUrl", "qrUrl"],
  ];
  for (const [field, slot] of mapping) {
    const value = v.campaign[field];
    if (typeof value === "string" && value.trim()) slots.push(slot);
  }
  if (v.brandId && v.flags.useBrandLogo) slots.push("logo");
  if (v.stockAssetId) slots.push("certification");
  return slots;
}

function referencesForVariant(assets: QuickCreateAssetSnapshot[], spec: VariantSpec | null) {
  return assets.filter((asset) => {
    if (asset.role.endsWith("_overlay")) return false;
    if (asset.role !== "style_reference" || !asset.purpose?.startsWith("mood:")) return true;
    return spec?.moodRecipe ? asset.purpose.startsWith(`mood:${spec.moodRecipe.id}:`) : false;
  });
}
