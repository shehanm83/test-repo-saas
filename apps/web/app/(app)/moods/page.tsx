import { billingSegmentFor } from "@layertone/billing";
import { createDb, moods } from "@layertone/db";
import { eq } from "@layertone/db/operators";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { MoodsBrowser } from "@/components/moods/moods-browser";
import { getSessionWorkspace } from "@/lib/auth/server";

export default async function MoodsPage() {
  const { workspace } = await getSessionWorkspace();
  if (billingSegmentFor(workspace?.planCode) === "free") {
    return <MoodsBrowser moods={[]} locked />;
  }

  const config = loadConfig();
  const previewStorage = createPreviewStorage(config);
  const rows = await createDb(config.db.url, "app_user")
    .select()
    .from(moods)
    .where(eq(moods.status, "published"));

  const items = await Promise.all(rows.map(async (m) => {
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      kind: m.kind ?? "Evergreen",
      status: m.status,
      group: seasonGroup(m, new Date()),
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

function seasonGroup(
  mood: { kind: string; validFrom: Date | null; validTo: Date | null },
  now: Date,
): "now" | "always" | "soon" {
  if (mood.kind !== "seasonal") return "always";
  if (!mood.validFrom && !mood.validTo) return "now";

  const nowMs = now.getTime();
  const start = mood.validFrom ? dateWithYear(mood.validFrom, now.getUTCFullYear()) : now;
  let end = mood.validTo ? dateWithYear(mood.validTo, now.getUTCFullYear()) : start;
  if (end < start) end = dateWithYear(mood.validTo!, now.getUTCFullYear() + 1);

  return start.getTime() <= nowMs && end.getTime() >= nowMs ? "now" : "soon";
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
