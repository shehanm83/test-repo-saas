import { createDb, listBrands } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { CampaignShell } from "@/components/campaign/campaign-shell";
import { emptyBrief } from "@/components/campaign/brief/defaults";
import { FIXTURE_PRODUCTS } from "@/components/campaign/brief/fixtures";
import type { BrandLite } from "@/components/generate/commercial/types";
import { getSessionWorkspace } from "@/lib/auth/server";

/**
 * The campaign brief starts with the active workspace's real brand kits.
 * Products remain local until their backend slice is wired separately.
 */
export default async function NewCampaignPage() {
  const { session } = await getSessionWorkspace();
  const config = loadConfig();
  const db = createDb(config.db.url, "app_user");
  const rows = session.workspaceId ? await listBrands(db, session.workspaceId) : [];
  const storage = createStorage(config);
  const brands: BrandLite[] = await Promise.all(
    rows.map(async (brand) => {
      const logoUrl = brand.logoS3Key
        ? await storage.getSignedUrl(brand.logoS3Key, 60 * 60).catch(() => null)
        : null;

      return {
        id: brand.id,
        name: brand.name,
        palette: paletteColors(brand.palette),
        fonts: brand.fonts,
        logoAssets: logoUrl
          ? [
              {
                id: `${brand.id}-primary-logo`,
                url: logoUrl,
              },
            ]
          : [],
      };
    }),
  );
  const defaultBrandId = brands.length === 1 ? brands[0]!.id : "";

  return (
    <CampaignShell
      initialForm={emptyBrief(defaultBrandId)}
      brands={brands}
      products={FIXTURE_PRODUCTS}
    />
  );
}

function paletteColors(
  palette: {
    primary: string;
    secondary?: string;
    accent?: string;
    extras?: string[];
  } | null,
): string[] {
  if (!palette) return [];
  return [palette.primary, palette.secondary, palette.accent, ...(palette.extras ?? [])].filter(
    (color): color is string => Boolean(color),
  );
}

function createStorage(config: ReturnType<typeof loadConfig>) {
  return new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketApp,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey ? { secretAccessKey: config.storage.secretAccessKey } : {}),
  });
}
