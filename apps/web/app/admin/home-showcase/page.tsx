import { HomeShowcaseApi } from "@layertone/api/home-showcase";
import { loadConfig } from "@layertone/shared/config";

import { HomeShowcaseAdmin } from "@/components/admin/home-showcase-admin";
import { createServerAdapters } from "@/lib/server/adapters";

export default async function AdminHomeShowcasePage() {
  const api = new HomeShowcaseApi(loadConfig(), createServerAdapters() as never);
  const initial = await api.getAdminView();
  return <HomeShowcaseAdmin initial={initial} />;
}
