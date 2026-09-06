import { NextResponse } from "next/server";

import { createDb, users, workspaces, workspaceMembers } from "@layertone/db";
import { ilike, or, eq, desc } from "drizzle-orm";
import { loadConfig } from "@layertone/shared/config";

import { getServerSession } from "@/lib/auth/server";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const db = createDb(loadConfig().db.url, "app_admin");

  if (!q) {
    // Return recent users with their workspaces
    const rows = await db
      .select({
        userId: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceStatus: workspaces.status,
        workspacePlan: workspaces.planCode,
        stripeCustomerId: workspaces.stripeCustomerId,
      })
      .from(users)
      .leftJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
      .leftJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .orderBy(desc(users.createdAt))
      .limit(50);

    return NextResponse.json({ results: rows });
  }

  const pattern = `%${q}%`;

  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceStatus: workspaces.status,
      workspacePlan: workspaces.planCode,
      stripeCustomerId: workspaces.stripeCustomerId,
    })
    .from(users)
    .leftJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
    .leftJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      or(
        ilike(users.email, pattern),
        ilike(workspaces.name, pattern),
        ilike(workspaces.stripeCustomerId, pattern),
      ),
    )
    .limit(50);

  return NextResponse.json({ results: rows });
}
