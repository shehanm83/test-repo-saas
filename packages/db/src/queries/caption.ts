import { eq, sql } from "drizzle-orm";

import type { Db } from "../client";
import { captionJobs } from "../schema";
import { withWorkspace } from "../with-workspace";

export async function insertCaption(
  db: Db,
  workspaceId: string,
  v: typeof captionJobs.$inferInsert,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [r] = await tx.insert(captionJobs).values(v).returning();
    return r;
  });
}

export async function updateCaption(
  db: Db,
  workspaceId: string,
  id: string,
  patch: Partial<typeof captionJobs.$inferInsert>,
) {
  return withWorkspace(db, workspaceId, async (tx) =>
    tx
      .update(captionJobs)
      .set({ ...patch, completedAt: sql`now()` })
      .where(eq(captionJobs.id, id)),
  );
}
