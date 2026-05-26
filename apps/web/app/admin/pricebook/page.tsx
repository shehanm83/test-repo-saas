import { PricebookApi } from "@layertone/api/pricebook";
import { PAYG_ACTION_MARKUP, PAYG_RETENTION_DAYS_PER_CREDIT } from "@layertone/billing";
import { loadConfig } from "@layertone/shared/config";

import { PricebookAdmin } from "@/components/admin/pricebook-admin";

export default async function AdminPricebookPage() {
  const rows = await new PricebookApi(loadConfig()).list();
  return (
    <PricebookAdmin
      rows={rows as never}
      paygActionMarkup={PAYG_ACTION_MARKUP}
      paygRetentionDaysPerCredit={PAYG_RETENTION_DAYS_PER_CREDIT}
    />
  );
}
