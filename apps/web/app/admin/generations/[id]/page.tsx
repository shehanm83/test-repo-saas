import { notFound } from "next/navigation";

import {
  brands,
  createDb,
  generations,
  generationVariants,
  creditLedgerEntries,
  auditLog,
  moods,
  users,
  workspaces,
} from "@layertone/db";
import { eq, desc } from "drizzle-orm";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { GenerationInspector } from "@/components/admin/generation-inspector";

export const dynamic = "force-dynamic";

export default async function AdminGenerationDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  const [generation] = await db
    .select()
    .from(generations)
    .where(eq(generations.id, id))
    .limit(1);

  if (!generation) notFound();

  const variantRows = await db
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

  const [brand] = await db
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .where(eq(brands.id, generation.brandId))
    .limit(1);

  const moodRow = generation.moodId
    ? await db
        .select({ id: moods.id, name: moods.name })
        .from(moods)
        .where(eq(moods.id, generation.moodId))
        .limit(1)
    : [];

  const [requester] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, generation.requestedByUserId))
    .limit(1);

  const storage = new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketApp,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey
      ? { secretAccessKey: config.storage.secretAccessKey }
      : {}),
  });

  const variants = await Promise.all(
    variantRows.map(async (v) => ({
      id: v.id,
      status: v.status,
      modelUsed: v.modelUsed,
      templateId: v.templateId,
      outputS3Key: v.outputS3Key,
      url: v.outputS3Key
        ? await storage.getSignedUrl(v.outputS3Key, 60 * 60).catch(() => null)
        : null,
      creditCost: v.creditCost,
      renderMs: v.renderMs,
      errorPayload: v.errorPayload,
    })),
  );

  return (
    <GenerationInspector
      data={{
        generation: {
          id: generation.id,
          workspaceId: generation.workspaceId,
          brandId: generation.brandId,
          moodId: generation.moodId,
          brief: generation.brief,
          status: generation.status,
          settings: generation.settings as Record<string, unknown>,
          requestedByUserId: generation.requestedByUserId,
          createdAt: generation.createdAt.toISOString(),
          completedAt: generation.completedAt
            ? generation.completedAt.toISOString()
            : null,
        },
        brandName: brand?.name ?? null,
        moodName: moodRow[0]?.name ?? null,
        workspaceName: workspace?.name ?? null,
        userEmail: requester?.email ?? null,
        variants,
        ledger: ledgerEntries.map((e) => ({
          id: e.id,
          createdAt: e.createdAt.toISOString(),
          kind: e.kind,
          amount: e.amount,
          metadata: (e.metadata as Record<string, unknown> | null) ?? null,
          generationId: e.generationId,
        })),
        audit: auditEntries.map((a) => ({
          id: a.id,
          action: a.action,
          actorUserId: a.actorUserId,
          payload: a.payload,
          createdAt: a.createdAt.toISOString(),
        })),
      }}
    />
  );
}
