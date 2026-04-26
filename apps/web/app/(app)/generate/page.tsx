import { Ledger } from "@studio/billing";
import { createDb, listAvailableMoods, listBrands } from "@studio/db";
import { loadConfig } from "@studio/shared";

import { Generate } from "@/components/generate/generate";
import { getSessionWorkspace } from "@/lib/auth/server";

const SEASONAL_NOW = new Set(["christmas", "midsummer", "diwali", "lunar-newyear"]);
const SEASONAL_SOON = new Set(["halloween"]);

const MOOD_IMG: Record<string, string> = {
  christmas: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=400&q=80",
  midsummer: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&q=80",
  "minimalist-tech":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
  editorial: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80",
  "sunset-warm": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&q=80",
  "bold-bauhaus": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80",
  halloween: "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&q=80",
  "lunar-newyear":
    "https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=400&q=80",
};

export default async function GeneratePage() {
  const { session, workspace } = await getSessionWorkspace();
  const config = loadConfig();
  const adminDb = createDb(config.db.url, "app_admin");
  const userDb = createDb(config.db.url, "app_user");
  const credits = session.workspaceId
    ? await new Ledger(adminDb).getBalance(session.workspaceId)
    : 0;
  const brands = session.workspaceId ? await listBrands(userDb, session.workspaceId) : [];
  const moods = await listAvailableMoods(userDb);

  const moodPayload = moods.map((m) => ({
    id: m.id,
    name: m.name,
    kind: m.kind ?? "Evergreen",
    group: SEASONAL_NOW.has(m.slug)
      ? ("now" as const)
      : SEASONAL_SOON.has(m.slug)
        ? ("soon" as const)
        : ("always" as const),
    img: MOOD_IMG[m.slug] ?? null,
    colors: m.accentPalette ?? undefined,
  }));

  const brandPayload = brands.map((b) => ({
    id: b.id,
    name: b.name,
    palette: Array.isArray((b.palette as { colors?: string[] } | null)?.colors)
      ? (b.palette as { colors?: string[] }).colors!
      : Object.values((b.palette as Record<string, string> | null) ?? {}).filter(
          (v): v is string => typeof v === "string",
        ),
  }));

  void workspace;
  return <Generate brands={brandPayload} moods={moodPayload} credits={credits} />;
}
