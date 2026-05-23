import { createDb, moods } from "@layertone/db";
import { eq } from "@layertone/db/operators";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { MoodsBrowser } from "@/components/moods/moods-browser";

export default async function MoodsPage() {
  const config = loadConfig();
  const previewStorage = createPreviewStorage(config);
  const rows = await createDb(config.db.url, "app_user")
    .select()
    .from(moods)
    .where(eq(moods.status, "published"));

  const now = new Date();
  const items = await Promise.all(rows.map(async (m) => {
    const validTo = m.validTo ? new Date(m.validTo) : null;
    const validFrom = m.validFrom ? new Date(m.validFrom) : null;
    const dateGroup =
      validFrom && validFrom > now
        ? "soon"
        : validTo && validTo < now
          ? "soon"
          : null;
    const kindGroup = m.kind === "seasonal" ? "now" : "always";
    const group = (dateGroup ?? kindGroup) as "now" | "always" | "soon";
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      kind: m.kind ?? "Evergreen",
      status: m.status,
      group,
      img: await signedPreviewUrl(previewStorage, m.previewS3Key),
      colors: (m.accentPalette ?? []) as string[],
      motifs: (m.decorationTags ?? []) as string[],
      validFrom: m.validFrom ? new Date(m.validFrom).toISOString() : null,
      validTo: m.validTo ? new Date(m.validTo).toISOString() : null,
    };
  }));

  return <MoodsBrowser moods={items} />;
}

function createPreviewStorage(config: ReturnType<typeof loadConfig>) {
  return new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketGlobal,
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
