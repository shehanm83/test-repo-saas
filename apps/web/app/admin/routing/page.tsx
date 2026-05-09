import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { RoutingAdmin } from "@/components/admin/routing-admin";

export default async function AdminRoutingPage() {
  const api = new TaxonomyApi(loadConfig());
  const [routing, models, allStrengths] = await Promise.all([
    api.listRouting(),
    api.listModels(),
    api.listStrengths(),
  ]);

  return (
    <RoutingAdmin
      routing={routing as never}
      models={models as never}
      strengths={allStrengths as never}
    />
  );
}
