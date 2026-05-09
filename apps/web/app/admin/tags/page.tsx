import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { TagsAdmin } from "@/components/admin/tags-admin";

export default async function AdminTagsPage() {
  const rows = await new TaxonomyApi(loadConfig()).listTags();
  return <TagsAdmin rows={rows as never} />;
}
