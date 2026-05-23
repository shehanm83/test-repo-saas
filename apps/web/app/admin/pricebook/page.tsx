import { PricebookApi } from "@layertone/api/pricebook";
import { loadConfig } from "@layertone/shared/config";

import { PricebookAdmin } from "@/components/admin/pricebook-admin";

export default async function AdminPricebookPage() {
  const rows = await new PricebookApi(loadConfig()).list();
  return <PricebookAdmin rows={rows as never} />;
}
