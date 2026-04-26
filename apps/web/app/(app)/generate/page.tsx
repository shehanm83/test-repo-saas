import { createDb, listAvailableMoods, listBrands } from "@studio/db";
import { loadConfig } from "@studio/shared";

import { StudioGenerate } from "@/components/generate/studio-generate";
import { getSessionWorkspace } from "@/lib/auth/server";

export default async function GeneratePage() {
  const { session } = await getSessionWorkspace();
  const db = createDb(loadConfig().db.url, "app_user");
  const brands = session.workspaceId ? await listBrands(db, session.workspaceId) : [];
  const moods = await listAvailableMoods(db);

  return (
    <StudioGenerate
      brands={brands.map((brand) => ({ id: brand.id, name: brand.name }))}
      moods={moods.map((mood) => ({ id: mood.id, name: mood.name, kind: mood.kind }))}
    />
  );
}

