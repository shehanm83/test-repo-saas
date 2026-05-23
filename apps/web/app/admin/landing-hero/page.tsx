import { LandingHeroApi } from "@layertone/api/landing-hero";
import { loadConfig } from "@layertone/shared/config";

import { LandingHeroAdmin } from "@/components/admin/landing-hero-admin";
import { createServerAdapters } from "@/lib/server/adapters";

export default async function AdminLandingHeroPage() {
  const api = new LandingHeroApi(loadConfig(), createServerAdapters() as never);
  const rows = await api.listSets();
  return <LandingHeroAdmin rows={rows} />;
}
