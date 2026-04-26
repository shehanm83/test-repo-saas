import { brands, createDb, generations, moods } from "@studio/db";
import { desc, eq, inArray } from "@studio/db/operators";
import { loadConfig } from "@studio/shared";

import { HistoryList } from "@/components/history/history-list";
import { getSessionWorkspace } from "@/lib/auth/server";

export default async function HistoryPage() {
  const { session } = await getSessionWorkspace();
  const db = createDb(loadConfig().db.url, "app_user");

  if (!session.workspaceId) {
    return <HistoryList items={[]} />;
  }

  const rows = await db
    .select()
    .from(generations)
    .where(eq(generations.workspaceId, session.workspaceId))
    .orderBy(desc(generations.createdAt))
    .limit(50);

  const brandRows =
    rows.length > 0
      ? await db
          .select()
          .from(brands)
          .where(inArray(brands.id, rows.map((row) => row.brandId)))
      : [];

  const moodRows =
    rows.filter((row) => row.moodId).length > 0
      ? await db
          .select()
          .from(moods)
          .where(
            inArray(
              moods.id,
              rows
                .map((row) => row.moodId)
                .filter((value): value is string => Boolean(value)),
            ),
          )
      : [];

  const brandMap = new Map(brandRows.map((brand) => [brand.id, brand.name]));
  const moodMap = new Map(moodRows.map((mood) => [mood.id, mood.name]));

  return (
    <HistoryList
      items={rows.map((row) => ({
        id: row.id,
        brief: row.brief,
        brandName: brandMap.get(row.brandId) ?? "Brand",
        moodName: row.moodId ? moodMap.get(row.moodId) ?? null : null,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
