import { StockApi } from "@studio/api/stock";
import { loadConfig } from "@studio/shared";

import { StockAdmin } from "@/components/admin/stock-admin";
import { createServerAdapters } from "@/lib/server/adapters";

export default async function AdminStockPage() {
  const items = await new StockApi(loadConfig(), createServerAdapters() as never).adminList();
  return <StockAdmin items={items as never} />;
}
