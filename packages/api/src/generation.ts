import { randomUUID } from "node:crypto";

import { Ledger, InsufficientCredits } from "@studio/billing";
import {
  createDb,
  listAvailableMoods,
  pickTemplates,
  insertGeneration,
  insertVariants,
  getGenerationFull,
  updateGenerationInspirationKey,
  priceBookLookup,
} from "@studio/db";
import { resolveOutputTarget, assertMoodSupportsOutputAspectRatio } from "@studio/shared";
import type { Adapters, Config } from "@studio/shared";
import { keys } from "@studio/storage";
import { z } from "zod";

const VARIANT_COUNT = 4;

const Input = z.object({
  brandId: z.string().uuid(),
  moodId: z.string().uuid().optional().nullable(),
  brief: z.string().min(1).max(500),
  outputTarget: z.unknown(),
  inspirationUploadId: z.string().uuid().optional(),
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
    .default({}),
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

    // Mood compatibility
    if (v.moodId) {
      const moods = await listAvailableMoods(this.db(), {
        aspectRatio: target.aspectRatio,
      });
      const m = moods.find((x) => x.id === v.moodId);
      if (!m) {
        const e = new Error("mood-not-available-for-aspect-ratio");
        (e as Error & { code?: string }).code = "validation.mood_aspect_mismatch";
        throw e;
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
      const e = new Error("no-template-found");
      (e as Error & { code?: string }).code = "validation.no_template";
      throw e;
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
    const ledger = new Ledger(this.db("app_admin"));
    const reservationKey = `gen-reserve-${args.workspaceId}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    try {
      await ledger.reserve({
        workspaceId: args.workspaceId,
        amount: totalCredits,
        idempotencyKey: reservationKey,
      });
    } catch (e) {
      if (e instanceof InsufficientCredits) {
        const err = new Error("insufficient-credits");
        (err as Error & { code?: string; httpStatus?: number }).code =
          "billing.insufficient_credits";
        (err as Error & { httpStatus?: number }).httpStatus = 402;
        throw err;
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

  async regenerateVariant(_args: {
    workspaceId: string;
    userId: string;
    generationId: string;
    input: unknown;
  }) {
    throw new Error("not-implemented-this-slice");
  }
}
