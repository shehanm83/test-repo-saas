import { UseCaseApi } from "@vyora/api/use-cases";
import { loadConfig } from "@vyora/shared/config";

import { UseCasesAdmin } from "@/components/admin/use-cases-admin";

export default async function AdminUseCasesPage() {
  const rows = await new UseCaseApi(loadConfig()).list();
  return <UseCasesAdmin rows={rows as never} />;
}
