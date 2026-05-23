import { randomUUID } from "node:crypto";

import { InsufficientCredits, Ledger } from "@layertone/billing";
import { createDb, getGenerationFull, insertCaption } from "@layertone/db";
import { AppError } from "@layertone/shared/errors/app-error";
import { CODES } from "@layertone/shared/errors/codes";
import type { Adapters, Config } from "@layertone/shared";
import { z } from "zod";

import { assertBriefAllowed } from "./aup";
import { assertWorkspaceCanGenerate } from "./workspace-status";

const CAPTION_CREDIT_COST = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Input = z.object({
  generationId: z.preprocess(
    (value) => (typeof value === "string" && UUID_RE.test(value.trim()) ? value.trim() : undefined),
    z.string().optional(),
  ),
  brief: z.string().min(1).max(500),
  voice: z.string().max(500).optional(),
  lengthTier: z.enum(["short", "medium", "long"]).optional(),
  tone: z.enum(["professional", "warm", "bold", "playful", "luxury", "direct"]).optional(),
  includeGenerationContext: z.boolean().optional(),
  short: z.boolean().optional(),
});

export class CaptionApi {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  private db(role: "app_user" | "app_admin" = "app_user") {
    return createDb(this.config.db.url, role);
  }

  async create(args: { workspaceId: string; userId: string; input: unknown }) {
    const v = Input.parse(args.input);
    const lengthTier = v.short ? "short" : (v.lengthTier ?? "medium");
    const cost = CAPTION_CREDIT_COST;
    const id = randomUUID();

    const adminDb = this.db("app_admin");
    const generationContext =
      v.includeGenerationContext && v.generationId
        ? await this.getCaptionGenerationContext(args.workspaceId, v.generationId)
        : null;

    await assertWorkspaceCanGenerate(adminDb, args.workspaceId);
    await assertBriefAllowed(adminDb, {
      brief: [v.brief, generationContext].filter(Boolean).join("\n\n"),
      workspaceId: args.workspaceId,
      userId: args.userId,
    });

    const ledger = new Ledger(adminDb, this.adapters.telemetry);
    try {
      await ledger.reserve({
        workspaceId: args.workspaceId,
        amount: cost,
        idempotencyKey: `cap-reserve-${id}`,
        captionJobId: id,
      });
    } catch (e) {
      if (e instanceof InsufficientCredits) {
        throw new AppError(
          CODES.BILLING_INSUFFICIENT_CREDITS,
          "You don't have enough credits to create this caption.",
          402,
          { balance: e.balance, requested: e.requested },
        );
      }
      throw e;
    }

    await insertCaption(this.db(), args.workspaceId, {
      id,
      workspaceId: args.workspaceId,
      generationId: v.generationId ?? null,
      brief: v.brief,
      voice: buildCaptionVoicePrompt({
        tone: v.tone ?? "professional",
        generationContext,
        voice: v.voice,
        short: lengthTier === "short",
      }),
      lengthTier,
      creditCost: cost,
    });

    await this.adapters.queue.send(
      this.config.queue.captionsQueue,
      { jobId: id, workspaceId: args.workspaceId },
      { idempotencyKey: id },
    );

    this.adapters.telemetry.metric("caption.created", 1, { tier: lengthTier });
    this.adapters.telemetry.metric("caption.credits_reserved", cost, { tier: lengthTier });

    return { jobId: id, status: "pending" as const, reservedCredits: cost };
  }

  private async getCaptionGenerationContext(workspaceId: string, generationId: string) {
    const generation = await getGenerationFull(this.db(), workspaceId, generationId);
    if (!generation) return null;
    return buildGenerationCaptionContext(generation);
  }
}

function buildCaptionVoicePrompt(args: {
  tone: string;
  generationContext?: string | null | undefined;
  voice?: string | undefined;
  short: boolean;
}) {
  return [
    `Tone: ${args.tone}`,
    `Length preference: ${args.short ? "short caption" : "standard social caption"}`,
    args.generationContext?.trim()
      ? `Use approved generation context:\n${args.generationContext.trim()}`
      : "Use approved generation context: not approved by user",
    args.voice?.trim() ? `Brand voice notes: ${args.voice.trim()}` : "Brand voice notes: neutral",
  ].join("\n");
}

function buildGenerationCaptionContext(generation: { brief: string; settings: unknown }) {
  const settings = asRecord(generation.settings);
  const commercial = asRecord(settings.commercial);
  const output = asRecord(settings.output_target ?? commercial.primary_output_target);
  const prompt = asRecord(commercial.prompt);

  return [
    `Original image brief: ${generation.brief}`,
    formatOutputContext(output),
    formatObjectContext("Creation", {
      mode: commercial.mode,
      creation_type: commercial.creation_type,
    }),
    formatObjectContext("Campaign", commercial.campaign),
    formatObjectContext("Template", commercial.template),
    formatObjectContext("Composition", commercial.composition),
    formatObjectContext("Outputs", commercial.outputs),
    prompt.rendered_prompt
      ? `Image prompt summary: ${truncate(String(prompt.rendered_prompt), 900)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatOutputContext(output: Record<string, unknown>) {
  const bits = [
    output.platform ? `platform ${String(output.platform)}` : null,
    output.format ? `format ${String(output.format)}` : null,
    output.width && output.height ? `${String(output.width)} x ${String(output.height)}` : null,
    output.aspectRatio ? `aspect ${String(output.aspectRatio)}` : null,
  ].filter(Boolean);
  return bits.length ? `Output: ${bits.join(", ")}` : null;
}

function formatObjectContext(label: string, value: unknown) {
  const record = asRecord(value);
  const entries = Object.entries(record)
    .filter(([, item]) => item !== null && item !== undefined && item !== "")
    .slice(0, 10)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(", ") : String(item)}`);
  return entries.length ? `${label}: ${entries.join("; ")}` : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}
