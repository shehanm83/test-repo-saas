import { createDb, moods } from "@studio/db";
import { eq } from "@studio/db/operators";
import { loadConfig } from "@studio/shared";

import { MoodsBrowser } from "@/components/moods/moods-browser";

export default async function MoodsPage() {
  const allMoods = await createDb(loadConfig().db.url, "app_user")
    .select()
    .from(moods)
    .where(eq(moods.status, "published"));

  return <MoodsBrowser moods={allMoods as never} />;
}
