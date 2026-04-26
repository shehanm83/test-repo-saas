import { sql } from "drizzle-orm";

import type { Db, TransactionDb } from "./client";

export async function withWorkspace<T>(
  db: Db,
  workspaceId: string,
  fn: (tx: TransactionDb) => Promise<T>,
  userId?: string,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_workspace_id', ${workspaceId}, true)`);
    if (userId) {
      await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
    }

    return fn(tx);
  });
}
