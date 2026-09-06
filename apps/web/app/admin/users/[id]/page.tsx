import { notFound } from "next/navigation";

import { createDb, workspaces, workspaceMembers, users, creditLedgerEntries } from "@layertone/db";
import { eq, desc } from "drizzle-orm";
import { loadConfig } from "@layertone/shared/config";

import { WorkspaceDetail } from "@/components/admin/workspace-detail";

export const dynamic = "force-dynamic";

export default async function AdminWorkspaceDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await props.params;
  const { page: pageStr } = await props.searchParams;
  const page = Math.max(0, parseInt(pageStr ?? "0", 10));
  const pageSize = 20;

  const db = createDb(loadConfig().db.url, "app_admin");

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1);

  if (!workspace) notFound();

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

  return (
    <WorkspaceDetail
      workspace={workspace as never}
      members={members as never}
      ledgerEntries={ledgerEntries as never}
      page={page}
      pageSize={pageSize}
    />
  );
}
