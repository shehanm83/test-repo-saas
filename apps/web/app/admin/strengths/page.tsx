import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { StrengthsAdmin } from "@/components/admin/strengths-admin";

export default async function AdminStrengthsPage() {
  const rows = await new TaxonomyApi(loadConfig()).listStrengths();
  return <StrengthsAdmin rows={rows as never} />;
}
