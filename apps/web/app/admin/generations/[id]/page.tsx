import { notFound } from "next/navigation";

import { createDb, generations, generationVariants, creditLedgerEntries, auditLog, workspaces } from "@studio/db";
import { eq, desc } from "drizzle-orm";
import { loadConfig } from "@studio/shared";

import { GenerationInspector } from "@/components/admin/generation-inspector";
import { OperatorActions } from "@/components/admin/operator-actions";

export const dynamic = "force-dynamic";

export default async function AdminGenerationDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const db = createDb(loadConfig().db.url, "app_admin");

  const [generation] = await db
    .select()
    .from(generations)
    .where(eq(generations.id, id))
    .limit(1);

  if (!generation) notFound();

  const variants = await db
    .select()
    .from(generationVariants)
    .where(eq(generationVariants.generationId, id));

  const ledgerEntries = await db
    .select()
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.generationId, id))
    .orderBy(desc(creditLedgerEntries.createdAt));

  const auditEntries = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.target, id))
    .orderBy(desc(auditLog.createdAt));

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name, status: workspaces.status })
    .from(workspaces)
    .where(eq(workspaces.id, generation.workspaceId))
    .limit(1);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", alignItems: "start" }}>
      <GenerationInspector
        generation={generation as never}
        variants={variants as never}
        ledgerEntries={ledgerEntries as never}
        auditEntries={auditEntries as never}
        workspace={workspace ?? null}
      />
      <div style={{ position: "sticky", top: "1rem" }}>
        <OperatorActions
          generationId={generation.id}
          workspaceId={generation.workspaceId}
          variants={variants as never}
        />
      </div>
    </div>
  );
}
