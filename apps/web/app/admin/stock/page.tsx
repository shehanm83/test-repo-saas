import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";

import { StockAdmin } from "@/components/admin/stock-admin";
import { createServerAdapters } from "@/lib/server/adapters";

export default async function AdminStockPage() {
  const items = await new StockApi(loadConfig(), createServerAdapters() as never).adminList();
  return <StockAdmin items={items as never} />;
}
