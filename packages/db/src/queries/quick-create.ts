import { and, eq, sql } from "drizzle-orm";

import type { Db } from "../client";
import {
  generationVariantFeedback,
  generationVariants,
  generations,
  quickCreateDrafts,
} from "../schema";
import { withWorkspace } from "../with-workspace";

export async function getQuickCreateDraft(db: Db, workspaceId: string, userId: string) {
  return withWorkspace(
    db,
    workspaceId,
    async (tx) => {
      const [draft] = await tx
        .select()
        .from(quickCreateDrafts)
        .where(
          and(
            eq(quickCreateDrafts.workspaceId, workspaceId),
            eq(quickCreateDrafts.userId, userId),
          ),
        )
        .limit(1);
      return draft ?? null;
    },
    userId,
  );
}

export async function saveQuickCreateDraft(
  db: Db,
  args: { workspaceId: string; userId: string; version: number; payload: unknown },
) {
  return withWorkspace(
    db,
    args.workspaceId,
    async (tx) => {
      const [draft] = await tx
        .insert(quickCreateDrafts)
        .values({
          workspaceId: args.workspaceId,
          userId: args.userId,
          version: args.version,
          payload: args.payload,
        })
        .onConflictDoUpdate({
          target: [quickCreateDrafts.workspaceId, quickCreateDrafts.userId],
          set: { version: args.version, payload: args.payload, updatedAt: sql`now()` },
        })
        .returning();
      return draft!;
    },
    args.userId,
  );
}

export async function deleteQuickCreateDraft(db: Db, workspaceId: string, userId: string) {
  return withWorkspace(
    db,
    workspaceId,
    async (tx) => {
      await tx
        .delete(quickCreateDrafts)
        .where(
          and(
            eq(quickCreateDrafts.workspaceId, workspaceId),
            eq(quickCreateDrafts.userId, userId),
          ),
        );
    },
    userId,
  );
}

export async function saveGenerationVariantFeedback(
  db: Db,
  args: {
    workspaceId: string;
    userId: string;
    variantId: string;
    rating: "up" | "down";
    reason?:
      | "wrong_product"
      | "not_my_idea"
      | "bad_composition"
      | "brand_mismatch"
      | "text_problem"
      | "other"
      | null;
    note?: string | null;
  },
) {
  return withWorkspace(
    db,
    args.workspaceId,
    async (tx) => {
      const [variant] = await tx
        .select({ id: generationVariants.id })
        .from(generationVariants)
        .innerJoin(generations, eq(generations.id, generationVariants.generationId))
        .where(
          and(
            eq(generationVariants.id, args.variantId),
            eq(generations.workspaceId, args.workspaceId),
          ),
        )
        .limit(1);
      if (!variant) return null;

      const [feedback] = await tx
        .insert(generationVariantFeedback)
        .values({
          workspaceId: args.workspaceId,
          userId: args.userId,
          variantId: args.variantId,
          rating: args.rating,
          reason: args.reason ?? null,
          note: args.note ?? null,
        })
        .onConflictDoUpdate({
          target: [
            generationVariantFeedback.workspaceId,
            generationVariantFeedback.userId,
            generationVariantFeedback.variantId,
          ],
          set: {
            rating: args.rating,
            reason: args.reason ?? null,
            note: args.note ?? null,
            updatedAt: sql`now()`,
          },
        })
        .returning();
      return feedback!;
    },
    args.userId,
  );
}
