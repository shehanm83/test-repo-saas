import { PricebookApi } from "@vyora/api/pricebook";
import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { PricebookAdmin } from "@/components/admin/pricebook-admin";

export default async function AdminPricebookPage() {
  const config = loadConfig();
  const [rows, models] = await Promise.all([
    new PricebookApi(config).list(),
    new TaxonomyApi(config).listModels(),
  ]);
  return <PricebookAdmin rows={rows as never} models={models as never} />;
}
