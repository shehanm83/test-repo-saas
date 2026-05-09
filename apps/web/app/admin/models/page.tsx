import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { ModelsAdmin } from "@/components/admin/models-admin";

export default async function AdminModelsPage() {
  const rows = await new TaxonomyApi(loadConfig()).listModels();
  return <ModelsAdmin rows={rows as never} />;
}
