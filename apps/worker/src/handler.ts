import { Ledger } from "@vyora/billing";
import {
  createDb,
  getGenerationFull,
  generationVariants,
  brands,
  moods,
  templates as templatesTable,
} from "@vyora/db";
import { tagSpan } from "@vyora/observability";
import { render } from "@vyora/renderer";
import type { Adapters, Config, AIImageRequest } from "@vyora/shared";
import { keys } from "@vyora/storage";
import { eq, sql } from "drizzle-orm";

export interface VariantJob {
  generationId: string;
  variantId: string;
  workspaceId: string;
}

type DbAdmin = ReturnType<typeof createDb>;

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

    const [brand] = await dbAdmin.select().from(brands).where(eq(brands.id, gen.brandId));
    const [tpl] = await dbAdmin
      .select()
      .from(templatesTable)
      .where(eq(templatesTable.id, v0.templateId));
    const mood = gen.moodId
      ? (await dbAdmin.select().from(moods).where(eq(moods.id, gen.moodId)))[0]
      : null;

    const settings = gen.settings as {
      output_target: { aspectRatio: string; width: number; height: number };
      flags?: Record<string, boolean>;
      usePremiumModel?: boolean;
    };

    // Brand grounding via embedding similarity
    let brandRefs: { s3Key: string; role: "brand_reference"; weight: number }[] = [];
    try {
      const { vector } = await this.adapters.ai.embedText(gen.brief);
      const r = await dbAdmin.execute<{ s3_key: string }>(sql`
        SELECT s3_key FROM brand_assets
        WHERE workspace_id = ${job.workspaceId} AND brand_id = ${gen.brandId}
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
      ? [
          {
            s3Key: gen.inspirationImageS3Key,
            role: "inspiration" as const,
            weight: influenceWeight,
          },
        ]
      : [];

    const target = settings.output_target;
    const promptParts = [gen.brief];
    if (mood?.promptModifiers) promptParts.push(mood.promptModifiers);
    if (tpl?.textSafeZones) {
      promptParts.push("Leave the indicated negative space visually quiet for headline overlay.");
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

    const modelCode = settings.usePremiumModel ? "gpt-image-1" : tpl.preferredModel;
    const negPrompt = mood?.negativePrompts || undefined;
    const baseReq: AIImageRequest = {
      modelCode,
      prompt: promptParts.join("\n\n"),
      ...(negPrompt ? { negativePrompt: negPrompt } : {}),
      references: [...brandRefs, ...inspirationRef],
      aspectRatio: target.aspectRatio,
      width: target.width,
      height: target.height,
      safetyLevel: "default",
    };

    // Generate with retry then bedrock fallback
    let imageRes;
    const providerStart = Date.now();
    try {
      imageRes = await this.adapters.ai.generateImage(baseReq);
    } catch {
      try {
        imageRes = await this.adapters.ai.generateImage(baseReq);
      } catch {
        try {
          const { references: _r, ...baseReqNoRefs } = baseReq;
          imageRes = await this.adapters.ai.generateImage({
            ...baseReqNoRefs,
            modelCode: "bedrock-sd35",
          });
        } catch (e2) {
          this.adapters.telemetry.captureException(e2, {
            variantId: job.variantId,
            stage: "image_generation",
          });
          await this.markFailed(dbAdmin, job, "model_failure", String(e2), "failed");
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
        slots: { headline: gen.brief },
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

    // Atomic fan-in: mark generation completed if all variants are terminal
    await dbAdmin.execute(sql`
      UPDATE generations SET status = 'completed', completed_at = now()
      WHERE id = ${job.generationId}
        AND NOT EXISTS (
          SELECT 1 FROM generation_variants
          WHERE generation_id = ${job.generationId}
            AND status NOT IN ('completed', 'failed', 'failed_safety')
        )
    `);

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
