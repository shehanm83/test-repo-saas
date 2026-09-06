import { createDb, listBrands, listProductIdentityAssets, listProducts } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { CampaignShell } from "@/components/campaign/campaign-shell";
import { emptyBrief } from "@/components/campaign/brief/defaults";
import type { BrandLite, ProductLite } from "@/components/generate/commercial/types";
import { getSessionWorkspace } from "@/lib/auth/server";

/**
 * The campaign brief is populated only with the active workspace's data.
 */
export default async function NewCampaignPage() {
  const { session } = await getSessionWorkspace();
  const config = loadConfig();
  const db = createDb(config.db.url, "app_user");
  const [rows, productRows] = session.workspaceId
    ? await Promise.all([
        listBrands(db, session.workspaceId),
        listProducts(db, session.workspaceId),
      ])
    : [[], []];
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
  const products: ProductLite[] = await Promise.all(
    productRows.map(async (product) => {
      const [primaryAsset] = session.workspaceId
        ? await listProductIdentityAssets(db, session.workspaceId, product.id)
        : [];

      return {
        id: product.id,
        brandId: product.brandId,
        name: product.name,
        title: product.title,
        subtitle: product.subtitle,
        description: product.description,
        brandLabel: product.brandLabel,
        model: product.model,
        sku: product.sku,
        category: product.category,
        priceMinor: product.priceMinor,
        compareAtPriceMinor: product.compareAtPriceMinor,
        currency: product.currency,
        discountText: product.discountText,
        keyFeatures: product.keyFeatures,
        benefits: product.benefits,
        targetAudience: product.targetAudience,
        primaryAsset: primaryAsset
          ? {
              id: primaryAsset.id,
              kind: primaryAsset.kind,
              url: await storage.getSignedUrl(primaryAsset.s3Key, 60 * 60).catch(() => null),
            }
          : null,
      };
    }),
  );
  const defaultBrandId = brands.length === 1 ? brands[0]!.id : "";

  return (
    <CampaignShell initialForm={emptyBrief(defaultBrandId)} brands={brands} products={products} />
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
