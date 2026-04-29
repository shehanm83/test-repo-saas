import { PricebookApi } from "@vyora/api/pricebook";
import { loadConfig } from "@vyora/shared";

import { PricebookAdmin } from "@/components/admin/pricebook-admin";

export default async function AdminPricebookPage() {
  const rows = await new PricebookApi(loadConfig()).list();
  return <PricebookAdmin rows={rows as never} />;
}
