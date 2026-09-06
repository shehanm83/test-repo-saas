import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";

import { StockAdmin } from "@/components/admin/stock-admin";
import { createGlobalStorageAdapter, createServerAdapters } from "@/lib/server/adapters";

export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const config = loadConfig();
  const items = await new StockApi(config, createServerAdapters() as never).adminList();
  const storage = createGlobalStorageAdapter(config);

  const itemsWithUrls = await Promise.all(
    items.map(async (item) => ({
      ...item,
      url: await storage.getSignedUrl(item.s3Key, 3600).catch(() => null),
    })),
  );

  return <StockAdmin items={itemsWithUrls as never} />;
}
