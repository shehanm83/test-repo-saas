import { randomUUID } from "node:crypto";

import { Ledger, InsufficientCredits } from "@studio/billing";
import {
  and,
  createDb,
  eq,
  generations,
  listAvailableMoods,
  pickTemplates,
  insertGeneration,
  insertVariants,
  getGenerationFull,
  updateGenerationInspirationKey,
  priceBookLookup,
} from "@studio/db";
import { tagSpan } from "@studio/observability";
import {
  AppError,
  CODES,
  resolveOutputTarget,
  assertMoodSupportsOutputAspectRatio,
} from "@studio/shared";
import type { Adapters, Config } from "@studio/shared";
import { keys } from "@studio/storage";
import { z } from "zod";

import { assertBriefAllowed } from "./aup";
import { assertWorkspaceCanGenerate } from "./workspace-status";

const VARIANT_COUNT = 4;

const Input = z.object({
  brandId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  moodId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional().nullable(),
  brief: z.string().min(1).max(500),
  outputTarget: z.unknown(),
  inspirationUploadId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  inspirationInfluence: z.enum(["subtle", "balanced", "strong"]).optional(),
  flags: z
    .object({
      useBrandColors: z.boolean().default(true),
      useBrandLogo: z.boolean().default(true),
      useBrandFonts: z.boolean().default(true),
      brandStrict: z.boolean().default(false),
      applyMoodModifiers: z.boolean().default(true),
      applyMoodDecorations: z.boolean().default(true),
      applyMoodAccentColors: z.boolean().default(true),
      usePremiumModel: z.boolean().default(false),
    })
    .default({
      useBrandColors: true,
      useBrandLogo: true,
      useBrandFonts: true,
      brandStrict: false,
      applyMoodModifiers: true,
      applyMoodDecorations: true,
      applyMoodAccentColors: true,
      usePremiumModel: false,
    }),
});

export class GenerationApi {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  private db(role: "app_user" | "app_admin" = "app_user") {
    return createDb(this.config.db.url, role);
  }

  async create(args: { workspaceId: string; userId: string; input: unknown }) {
    const v = Input.parse(args.input);
    const target = resolveOutputTarget(v.outputTarget);

    const adminDb = this.db("app_admin");
    await assertWorkspaceCanGenerate(adminDb, args.workspaceId);
    await assertBriefAllowed(adminDb, {
      brief: v.brief,
      workspaceId: args.workspaceId,
      userId: args.userId,
    });

    // Mood compatibility
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

    // Pick templates
    const tpls = await pickTemplates(this.db(), {
      moodId: v.moodId ?? null,
      aspectRatio: target.aspectRatio,
      n: VARIANT_COUNT,
    });
    if (tpls.length === 0) {
      throw new AppError(
        CODES.VALIDATION_NO_TEMPLATE,
        "No matching template was found for your settings.",
        404,
      );
    }

    // Cost estimation
    const sizeBucket: "standard" | "large" =
      target.width * target.height > 1280 * 1280 ? "large" : "standard";
    const hasInspiration = !!v.inspirationUploadId;
    let pricebookVersion = 0;
    let totalCredits = 0;
    const variantPlan: { templateId: string; modelCode: string; credits: number }[] = [];

    for (const t of tpls) {
      const modelCode = v.flags.usePremiumModel ? "gpt-image-1" : t.preferredModel;
      const p = await priceBookLookup(this.db(), {
        modelCode,
        sizeBucket,
        premiumFlag: v.flags.usePremiumModel,
        hasInspirationFlag: hasInspiration,
      });
      pricebookVersion = p.version;
      totalCredits += p.credits;
      variantPlan.push({ templateId: t.tid, modelCode, credits: p.credits });
    }

    // Reserve credits
    const ledger = new Ledger(adminDb, this.adapters.telemetry);
    const reservationKey = `gen-reserve-${args.workspaceId}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    try {
      await ledger.reserve({
        workspaceId: args.workspaceId,
        amount: totalCredits,
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
      brandId: v.brandId,
      moodId: v.moodId ?? null,
      brief: v.brief,
      settings: {
        ...v.flags,
        output_target: target,
        variant_count: VARIANT_COUNT,
      },
      inspirationImageS3Key: null,
      inspirationInfluence: v.inspirationInfluence ?? null,
      priceBookVersion: pricebookVersion,
      requestedByUserId: args.userId,
    });

    // Claim inspiration upload if present
    if (v.inspirationUploadId) {
      const staging = keys.inspirationUploadStaging(args.workspaceId, v.inspirationUploadId, "png");
      const final = keys.inspirationClaimed(args.workspaceId, genId, "png");
      await this.adapters.storage.copy(staging, final);
      await this.adapters.storage.delete(staging);
      await updateGenerationInspirationKey(this.db("app_admin"), genId, final);
    }

    // Insert variants
    const variantRows = variantPlan.map((vp) => ({
      id: randomUUID(),
      generationId: genId,
      templateId: vp.templateId,
      modelUsed: vp.modelCode,
      creditCost: vp.credits,
    }));
    await insertVariants(this.db(), args.workspaceId, variantRows);

    // Enqueue SQS messages
    for (const row of variantRows) {
      await this.adapters.queue.send(
        this.config.queue.generationsQueue,
        { generationId: genId, variantId: row.id, workspaceId: args.workspaceId },
        { idempotencyKey: row.id },
      );
    }

    tagSpan("generation.create", {
      workspaceId: args.workspaceId,
      generationId: genId,
      variants: variantRows.length,
    });
    this.adapters.telemetry.metric("generation.created", 1, {
      hasInspiration: hasInspiration ? "true" : "false",
    });
    this.adapters.telemetry.metric("generation.variants", variantRows.length);
    this.adapters.telemetry.metric("generation.credits_reserved", totalCredits);

    return {
      generationId: genId,
      status: "pending" as const,
      variants: variantRows.map((r) => ({
        id: r.id,
        templateId: r.templateId,
        status: "queued" as const,
      })),
      reservedCredits: totalCredits,
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
    return { ...gen, variants };
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
