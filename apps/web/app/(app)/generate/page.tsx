import { Ledger } from "@layertone/billing";
import { billingSegmentFor } from "@layertone/billing";
import {
  adminListStock,
  createDb,
  listAvailableMoods,
  listBrandAssets,
  listBrands,
  listProducts,
} from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { Generate } from "@/components/generate/generate";
import { getSessionWorkspace } from "@/lib/auth/server";

export default async function GeneratePage() {
  const { session, workspace } = await getSessionWorkspace();
  const config = loadConfig();
  const adminDb = createDb(config.db.url, "app_admin");
  const userDb = createDb(config.db.url, "app_user");
  const credits = session.workspaceId
    ? await new Ledger(adminDb).getBalance(session.workspaceId)
    : 0;
  const brands = session.workspaceId ? await listBrands(userDb, session.workspaceId) : [];
  const products = session.workspaceId ? await listProducts(userDb, session.workspaceId) : [];
  const planSegment = billingSegmentFor(workspace?.planCode);
  const moods = planSegment === "free" ? [] : await listAvailableMoods(userDb);
  const moodPreviewStorage = createStorage(config, config.storage.bucketGlobal);
  const appStorage = createStorage(config, config.storage.bucketApp);
  const rawStock = await adminListStock(userDb);
  const stockAssets = await Promise.all(
    rawStock.map(async (item) => ({
      id: item.id,
      label: item.label,
      category: item.category,
      tags: item.tags,
      url: await moodPreviewStorage.getSignedUrl(item.s3Key, 14400).catch(() => null),
    })),
  );

  const moodPayload = await Promise.all(
    moods.map(async (m) => ({
      id: m.id,
      name: m.name,
      kind: m.kind ?? "Evergreen",
      group: moodGroup(m),
      img: await signedPreviewUrl(moodPreviewStorage, m.previewS3Key),
      colors: m.accentPalette ?? undefined,
    })),
  );

  const brandPayload = await Promise.all(
    brands.map(async (b) => {
      const assets = await listBrandAssets(userDb, session.workspaceId!, b.id);
      const logos = assets.filter((asset) => asset.kind === "logo");
      return {
        id: b.id,
        name: b.name,
        palette: brandPaletteColors(b.palette),
        logoAssets: await Promise.all(
          logos.map(async (asset) => ({
            id: asset.id,
            mimeType: asset.mimeType,
            width: asset.width,
            height: asset.height,
            url: await signedPreviewUrl(appStorage, asset.s3Key),
          })),
        ),
      };
    }),
  );

  const productPayload = products.map((product) => ({
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
  }));

  return (
    <Generate
      brands={brandPayload}
      moods={moodPayload}
      products={productPayload}
      stockAssets={stockAssets}
      credits={credits}
      planSegment={planSegment}
    />
  );
}

function brandPaletteColors(palette: unknown): string[] {
  if (!palette || typeof palette !== "object") return [];

  if (Array.isArray(palette)) {
    return palette.filter(
      (color): color is string => typeof color === "string" && color.trim().length > 0,
    );
  }

  const value = palette as {
    colors?: unknown;
    primary?: unknown;
    secondary?: unknown;
    accent?: unknown;
    extras?: unknown;
  };

  const ordered = [
    value.primary,
    value.secondary,
    value.accent,
    ...(Array.isArray(value.extras) ? value.extras : []),
  ].filter((color): color is string => typeof color === "string" && color.trim().length > 0);

  if (ordered.length > 0) return ordered;

  if (Array.isArray(value.colors)) {
    return value.colors.filter(
      (color): color is string => typeof color === "string" && color.trim().length > 0,
    );
  }

  return Object.values(value).flatMap((entry) => {
    if (typeof entry === "string" && entry.trim().length > 0) return [entry];
    if (Array.isArray(entry)) {
      return entry.filter(
        (color): color is string => typeof color === "string" && color.trim().length > 0,
      );
    }
    return [];
  });
}

function createStorage(config: ReturnType<typeof loadConfig>, bucket: string) {
  return new S3StorageAdapter({
    region: config.storage.region,
    bucket,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey ? { secretAccessKey: config.storage.secretAccessKey } : {}),
  });
}

async function signedPreviewUrl(storage: S3StorageAdapter, key: string | null) {
  if (!key) return null;
  return storage.getSignedUrl(key, 60 * 60).catch(() => null);
}

function moodGroup(mood: {
  kind: string;
  validFrom: Date | string | null;
  validTo: Date | string | null;
}) {
  if (mood.kind !== "seasonal") return "always" as const;
  if (!mood.validFrom && !mood.validTo) return "now" as const;

  const now = new Date();
  const nowMs = now.getTime();
  const start = mood.validFrom ? dateWithYear(new Date(mood.validFrom), now.getUTCFullYear()) : now;
  let end = mood.validTo ? dateWithYear(new Date(mood.validTo), now.getUTCFullYear()) : start;
  if (end < start) end = dateWithYear(new Date(mood.validTo!), now.getUTCFullYear() + 1);

  return start.getTime() <= nowMs && end.getTime() >= nowMs ? ("now" as const) : ("soon" as const);
}

function dateWithYear(date: Date, year: number) {
  return new Date(
    Date.UTC(
      year,
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}
