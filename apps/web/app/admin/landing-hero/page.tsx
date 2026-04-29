import { LandingHeroApi } from "@vyora/api/landing-hero";
import { loadConfig } from "@vyora/shared";

import { LandingHeroAdmin } from "@/components/admin/landing-hero-admin";
import { createServerAdapters } from "@/lib/server/adapters";

export default async function AdminLandingHeroPage() {
  const api = new LandingHeroApi(loadConfig(), createServerAdapters() as never);
  const rows = await api.listAll();
  const withUrls = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      previewUrl: await api.signedImageUrl(r.s3Key, 3600),
    })),
  );
  return <LandingHeroAdmin rows={withUrls} />;
}
