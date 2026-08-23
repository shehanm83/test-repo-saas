import { MoodApi } from "@layertone/api/mood";
import { TemplateApi } from "@layertone/api/template";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { MoodStudio } from "@/components/admin/mood-studio";

export default async function AdminMoodsPage() {
  const config = loadConfig();
  const moodApi = new MoodApi(config);
  const [moods, templates] = await Promise.all([
    moodApi.adminList(),
    new TemplateApi(config).adminList(),
  ]);

  const storage = new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketGlobal,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey ? { secretAccessKey: config.storage.secretAccessKey } : {}),
  });

  const items = await Promise.all(
    moods.map(async (m) => ({
      ...m,
      validFrom: m.validFrom ? m.validFrom.toISOString() : null,
      validTo: m.validTo ? m.validTo.toISOString() : null,
      previewImgUrl: m.previewS3Key
        ? await storage.getSignedUrl(m.previewS3Key, 3600).catch(() => null)
        : null,
    })),
  );

  const bindings = Object.fromEntries(
    await Promise.all(
      moods.map(async (mood) => [mood.id, await moodApi.adminBindings(mood.id)] as const),
    ),
  );

  const templateOptions = templates.map(({ id, name, slug, status, family, layout }) => ({
    id,
    name,
    slug,
    status,
    family,
    layout,
  }));

  return <MoodStudio moods={items as never} templates={templateOptions} bindings={bindings} />;
}
