import { NextResponse } from "next/server";

import { createDb, users, workspaces, workspaceMembers, creditLedgerEntries } from "@layertone/db";
import { eq, desc } from "drizzle-orm";
import { loadConfig } from "@layertone/shared/config";

import { getServerSession } from "@/lib/auth/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await props.params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const pageSize = 20;

  const db = createDb(loadConfig().db.url, "app_admin");

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  if (!workspace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const members = await db
    .select({
      id: users.id,
      email: users.email,
      role: workspaceMembers.role,
      acceptedAt: workspaceMembers.acceptedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, id));

  const ledgerEntries = await db
    .select()
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.workspaceId, id))
    .orderBy(desc(creditLedgerEntries.createdAt))
    .limit(pageSize)
    .offset(page * pageSize);

  return NextResponse.json({ workspace, members, ledgerEntries, page, pageSize });
}
