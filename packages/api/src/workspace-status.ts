import { type Db, eq, workspaces } from "@vyora/db";
import { AppError } from "@vyora/shared/errors/app-error";
import { CODES } from "@vyora/shared/errors/codes";

export async function assertWorkspaceCanGenerate(db: Db, workspaceId: string): Promise<void> {
  const [w] = await db
    .select({ status: workspaces.status })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!w) {
    throw new AppError(CODES.AUTH_INVALID_SESSION, "Workspace not found.", 404);
  }

  if (w.status === "read_only") {
    throw new AppError(
      CODES.BILLING_WORKSPACE_READ_ONLY,
      "Billing is paused. Update your payment method to continue generating.",
      402,
    );
  }

  if (w.status === "suspended" || w.status === "deleted") {
    throw new AppError(
      CODES.WORKSPACE_SUSPENDED,
      "This workspace has been suspended. Contact support if you believe this is a mistake.",
      403,
      { status: w.status },
    );
  }
}
