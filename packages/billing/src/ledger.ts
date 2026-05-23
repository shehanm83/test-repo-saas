import { creditLedgerEntries, type Db, workspaces, withWorkspace } from "@layertone/db";
import { eq, sql } from "drizzle-orm";

import { InsufficientCredits } from "./errors";

type Kind = "grant" | "reservation" | "commit" | "release" | "topup" | "refund" | "adjustment";

export interface LedgerEntry {
  kind: Kind;
  amount: number;
  workspaceId: string;
  idempotencyKey: string;
  generationId?: string;
  captionJobId?: string;
  stripeEventId?: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerTelemetry {
  metric(name: string, value: number, tags?: Record<string, string>): void;
}

export class Ledger {
  constructor(
    private readonly db: Db,
    private readonly telemetry?: LedgerTelemetry,
  ) {}

  async post(
    entry: LedgerEntry,
  ): Promise<{ id: string; balanceAfter: number; idempotent: boolean }> {
    const result = await withWorkspace(this.db, entry.workspaceId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(creditLedgerEntries)
        .where(eq(creditLedgerEntries.idempotencyKey, entry.idempotencyKey));

      if (existing) {
        return {
          id: existing.id,
          balanceAfter: existing.balanceAfter,
          idempotent: true,
        };
      }

      await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, entry.workspaceId))
        .for("update");

      const rows = await tx.execute<{ balance: number }>(sql`
        SELECT COALESCE(SUM(amount), 0)::int AS balance
        FROM credit_ledger_entries
        WHERE workspace_id = ${entry.workspaceId}
      `);

      const current = rows[0]?.balance ?? 0;
      const next = current + entry.amount;

      if (next < 0) {
        throw new InsufficientCredits(current, Math.abs(entry.amount));
      }

      const [inserted] = await tx
        .insert(creditLedgerEntries)
        .values({
          workspaceId: entry.workspaceId,
          kind: entry.kind,
          amount: entry.amount,
          balanceAfter: next,
          generationId: entry.generationId ?? null,
          captionJobId: entry.captionJobId ?? null,
          stripeEventId: entry.stripeEventId ?? null,
          idempotencyKey: entry.idempotencyKey,
          metadata: entry.metadata ?? null,
        })
        .returning();

      return { id: inserted!.id, balanceAfter: next, idempotent: false };
    });

    if (!result.idempotent) {
      this.telemetry?.metric(`ledger.${entry.kind}`, Math.abs(entry.amount), {
        kind: entry.kind,
      });
    }

    return result;
  }

  async getBalance(workspaceId: string): Promise<number> {
    return withWorkspace(this.db, workspaceId, async (tx) => {
      const rows = await tx.execute<{ balance: number }>(sql`
        SELECT COALESCE(SUM(amount), 0)::int AS balance
        FROM credit_ledger_entries
        WHERE workspace_id = ${workspaceId}
      `);
      return rows[0]?.balance ?? 0;
    });
  }

  grant(args: {
    workspaceId: string;
    amount: number;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
    stripeEventId?: string;
  }) {
    return this.post({ ...args, kind: "grant", amount: Math.abs(args.amount) });
  }

  topup(args: {
    workspaceId: string;
    amount: number;
    idempotencyKey: string;
    stripeEventId?: string;
  }) {
    return this.post({ ...args, kind: "topup", amount: Math.abs(args.amount) });
  }

  reserve(args: {
    workspaceId: string;
    amount: number;
    idempotencyKey: string;
    generationId?: string;
    captionJobId?: string;
  }) {
    return this.post({ ...args, kind: "reservation", amount: -Math.abs(args.amount) });
  }

  commit(args: {
    workspaceId: string;
    amount: number;
    idempotencyKey: string;
    generationId?: string;
    captionJobId?: string;
  }) {
    return this.post({ ...args, kind: "commit", amount: -Math.abs(args.amount) });
  }

  release(args: {
    workspaceId: string;
    amount: number;
    idempotencyKey: string;
    generationId?: string;
    captionJobId?: string;
  }) {
    return this.post({ ...args, kind: "release", amount: Math.abs(args.amount) });
  }

  refund(args: {
    workspaceId: string;
    amount: number;
    idempotencyKey: string;
    stripeEventId?: string;
  }) {
    return this.post({ ...args, kind: "refund", amount: Math.abs(args.amount) });
  }

  adjustment(args: {
    workspaceId: string;
    amount: number;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.post({ ...args, kind: "adjustment" });
  }
}
