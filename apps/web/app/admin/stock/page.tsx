import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { StockAdmin } from "@/components/admin/stock-admin";
import { createServerAdapters } from "@/lib/server/adapters";

export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const config = loadConfig();
  const items = await new StockApi(config, createServerAdapters() as never).adminList();

  const storage = new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketGlobal,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey
      ? { secretAccessKey: config.storage.secretAccessKey }
      : {}),
  });

  const itemsWithUrls = await Promise.all(
    items.map(async (item) => ({
      ...item,
      url: await storage.getSignedUrl(item.s3Key, 3600).catch(() => null),
    })),
  );

  return <StockAdmin items={itemsWithUrls as never} />;
}
