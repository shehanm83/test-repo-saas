import { Ledger } from "@vyora/billing";
import { createDb, captionJobs, updateCaption } from "@vyora/db";
import type { Adapters, Config } from "@vyora/shared";
import { eq } from "drizzle-orm";

const TARGET_TOKENS = { short: 80, medium: 200, long: 500 } as const;

export class CaptionWorker {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  async handle(job: { jobId: string; workspaceId: string }): Promise<void> {
    const dbAdmin = createDb(this.config.db.url, "app_admin");

    const [j] = await dbAdmin.select().from(captionJobs).where(eq(captionJobs.id, job.jobId));

    if (!j || j.status === "completed" || j.status === "failed") return;

    await dbAdmin
      .update(captionJobs)
      .set({ status: "running" })
      .where(eq(captionJobs.id, job.jobId));

    try {
      const maxTokens = TARGET_TOKENS[j.lengthTier] ?? 200;
      const r = await this.adapters.ai.generateText({
        modelCode: this.config.ai.openaiTextModel,
        systemPrompt:
          [
            "You write social-media captions for generated Quick Create images.",
            "Use the image brief and caption instructions together.",
            "Do not invent facts, prices, guarantees, certifications, or claims.",
            "Avoid hashtags unless the user explicitly asks for them.",
            "Return only the finished caption text in markdown.",
          ].join(" "),
        prompt: [
          `Generated image brief: ${j.brief}`,
          "",
          "Caption instructions:",
          j.voice ?? "Tone: professional\nLength preference: standard social caption\nMust include: no extra user instructions\nBrand voice notes: neutral",
          "",
          `Write a ${j.lengthTier === "short" ? "short" : "standard"} caption that is relevant to the generated image.`,
        ].join("\n"),
        maxTokens,
      });

      await updateCaption(dbAdmin, j.workspaceId, j.id, {
        status: "completed",
        outputText: r.text,
      });

      const ledger = new Ledger(dbAdmin, this.adapters.telemetry);
      await ledger.commit({
        workspaceId: j.workspaceId,
        amount: j.creditCost,
        idempotencyKey: `cap-commit-${j.id}`,
        captionJobId: j.id,
      });
    } catch (e) {
      await updateCaption(dbAdmin, j.workspaceId, j.id, {
        status: "failed",
        errorPayload: { message: String(e) },
      });

      const ledger = new Ledger(dbAdmin, this.adapters.telemetry);
      await ledger.release({
        workspaceId: j.workspaceId,
        amount: j.creditCost,
        idempotencyKey: `cap-release-${j.id}`,
        captionJobId: j.id,
      });
    }
  }
}
