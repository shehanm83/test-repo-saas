import { createDb, moods } from "@studio/db";
import { eq } from "@studio/db/operators";
import { loadConfig } from "@studio/shared";

import { MoodsBrowser } from "@/components/moods/moods-browser";

const MOOD_IMG: Record<string, string> = {
  christmas: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=600&q=80",
  midsummer: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&q=80",
  "minimalist-tech":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
  editorial: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80",
  "sunset-warm": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&q=80",
  "bold-bauhaus": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&q=80",
  halloween: "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=600&q=80",
  "lunar-newyear":
    "https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=600&q=80",
};

const SEASONAL_NOW = new Set(["christmas", "midsummer", "diwali", "lunar-newyear"]);
const SEASONAL_SOON = new Set(["halloween"]);

export default async function MoodsPage() {
  const rows = await createDb(loadConfig().db.url, "app_user")
    .select()
    .from(moods)
    .where(eq(moods.status, "published"));

  const now = new Date();
  const items = rows.map((m) => {
    const validTo = m.validTo ? new Date(m.validTo) : null;
    const validFrom = m.validFrom ? new Date(m.validFrom) : null;
    const dateGroup =
      validFrom && validFrom > now
        ? "soon"
        : validTo && validTo < now
          ? "soon"
          : null;
    const slugGroup = SEASONAL_SOON.has(m.slug)
      ? "soon"
      : SEASONAL_NOW.has(m.slug)
        ? "now"
        : null;
    const group = (dateGroup ?? slugGroup ?? "always") as "now" | "always" | "soon";
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      kind: m.kind ?? "Evergreen",
      status: m.status,
      group,
      img: MOOD_IMG[m.slug] ?? m.previewS3Key ?? null,
      colors: (m.accentPalette ?? []) as string[],
      motifs: (m.decorationTags ?? []) as string[],
      validFrom: m.validFrom ? new Date(m.validFrom).toISOString() : null,
      validTo: m.validTo ? new Date(m.validTo).toISOString() : null,
    };
  });

  return <MoodsBrowser moods={items} />;
}
