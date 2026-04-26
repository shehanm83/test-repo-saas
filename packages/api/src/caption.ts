import { randomUUID } from "node:crypto";

import { InsufficientCredits, Ledger } from "@studio/billing";
import { createDb, insertCaption } from "@studio/db";
import { AppError, CODES } from "@studio/shared";
import type { Adapters, Config } from "@studio/shared";
import { z } from "zod";

import { assertBriefAllowed } from "./aup";
import { assertWorkspaceCanGenerate } from "./workspace-status";

const COSTS = { short: 1, medium: 3, long: 5 } as const;

const Input = z.object({
  generationId: z.string().uuid().optional(),
  brief: z.string().min(1).max(500),
  voice: z.string().max(500).optional(),
  lengthTier: z.enum(["short", "medium", "long"]),
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
    const cost = COSTS[v.lengthTier];
    const id = randomUUID();

    const adminDb = this.db("app_admin");
    await assertWorkspaceCanGenerate(adminDb, args.workspaceId);
    await assertBriefAllowed(adminDb, {
      brief: v.brief,
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
      voice: v.voice ?? null,
      lengthTier: v.lengthTier,
      creditCost: cost,
    });

    await this.adapters.queue.send(
      this.config.queue.captionsQueue,
      { jobId: id, workspaceId: args.workspaceId },
      { idempotencyKey: id },
    );

    this.adapters.telemetry.metric("caption.created", 1, { tier: v.lengthTier });
    this.adapters.telemetry.metric("caption.credits_reserved", cost, { tier: v.lengthTier });

    return { jobId: id, status: "pending" as const, reservedCredits: cost };
  }
}
