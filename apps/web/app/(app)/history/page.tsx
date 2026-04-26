import {
  brands,
  createDb,
  generations,
  generationVariants,
  listBrands,
  moods,
} from "@studio/db";
import { desc, eq, inArray } from "@studio/db/operators";
import { loadConfig } from "@studio/shared";
import { S3StorageAdapter } from "@studio/storage";

import { HistoryList } from "@/components/history/history-list";
import { getSessionWorkspace } from "@/lib/auth/server";

export default async function HistoryPage() {
  const { session } = await getSessionWorkspace();
  const config = loadConfig();
  const db = createDb(config.db.url, "app_user");

  if (!session.workspaceId) {
    return <HistoryList items={[]} brands={[]} />;
  }

  const ws = session.workspaceId;
  const allBrands = await listBrands(db, ws);

  const rows = await db
    .select()
    .from(generations)
    .where(eq(generations.workspaceId, ws))
    .orderBy(desc(generations.createdAt))
    .limit(50);

  if (rows.length === 0) {
    return (
      <HistoryList
        items={[]}
        brands={allBrands.map((b) => ({ id: b.id, name: b.name }))}
      />
    );
  }

  const brandRows = await db
    .select()
    .from(brands)
    .where(inArray(brands.id, rows.map((r) => r.brandId)));

  const moodIds = rows
    .map((r) => r.moodId)
    .filter((v): v is string => Boolean(v));
  const moodRows =
    moodIds.length > 0
      ? await db.select().from(moods).where(inArray(moods.id, moodIds))
      : [];

  const variantRows = await db
    .select({
      id: generationVariants.id,
      generationId: generationVariants.generationId,
      outputS3Key: generationVariants.outputS3Key,
      creditCost: generationVariants.creditCost,
    })
    .from(generationVariants)
    .where(inArray(generationVariants.generationId, rows.map((r) => r.id)));

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

  const variantsByGen = new Map<
    string,
    { id: string; outputS3Key: string | null; creditCost: number }[]
  >();
  for (const v of variantRows) {
    const arr = variantsByGen.get(v.generationId) ?? [];
    arr.push({
      id: v.id,
      outputS3Key: v.outputS3Key,
      creditCost: v.creditCost,
    });
    variantsByGen.set(v.generationId, arr);
  }

  const brandMap = new Map(brandRows.map((b) => [b.id, b.name]));
  const moodMap = new Map(moodRows.map((m) => [m.id, m.name]));

  const items = await Promise.all(
    rows.map(async (row) => {
      const variants = variantsByGen.get(row.id) ?? [];
      const settings = row.settings as { output_target?: { aspectRatio?: string } } | null;
      const ar = settings?.output_target?.aspectRatio ?? "1:1";
      const totalCredits = variants.reduce((sum, v) => sum + v.creditCost, 0);
      const thumbs = await Promise.all(
        [0, 1, 2, 3].map(async (i) => {
          const v = variants[i];
          if (!v?.outputS3Key) return null;
          try {
            return await storage.getSignedUrl(v.outputS3Key, 60 * 60);
          } catch {
            return null;
          }
        }),
      );
      return {
        id: row.id,
        brief: row.brief,
        brandId: row.brandId,
        brandName: brandMap.get(row.brandId) ?? "Brand",
        moodName: row.moodId ? moodMap.get(row.moodId) ?? null : null,
        status: row.status,
        ar,
        credits: totalCredits,
        createdAt: row.createdAt.toISOString(),
        thumbs,
      };
    }),
  );

  return (
    <HistoryList
      items={items}
      brands={allBrands.map((b) => ({ id: b.id, name: b.name }))}
    />
  );
}
