import { randomUUID } from "node:crypto";

import { Ledger } from "@studio/billing";
import { createDb, insertCaption } from "@studio/db";
import type { Adapters, Config } from "@studio/shared";
import { z } from "zod";

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

    const ledger = new Ledger(this.db("app_admin"));
    await ledger.reserve({
      workspaceId: args.workspaceId,
      amount: cost,
      idempotencyKey: `cap-reserve-${id}`,
      captionJobId: id,
    });

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

    return { jobId: id, status: "pending" as const, reservedCredits: cost };
  }
}
