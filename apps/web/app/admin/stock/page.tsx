import { StockApi } from "@vyora/api/stock";
import { loadConfig } from "@vyora/shared";

import { StockAdmin } from "@/components/admin/stock-admin";
import { createServerAdapters } from "@/lib/server/adapters";

export default async function AdminStockPage() {
  const items = await new StockApi(loadConfig(), createServerAdapters() as never).adminList();
  return <StockAdmin items={items as never} />;
}
