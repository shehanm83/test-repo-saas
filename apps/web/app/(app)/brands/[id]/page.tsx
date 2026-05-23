import React from "react";

import { createDb, generations, getBrand, listBrandAssets } from "@layertone/db";
import { count, eq } from "@layertone/db/operators";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { I } from "@/components/icons";
import { BrandEditor } from "@/components/brands/brand-editor";
import { getSessionWorkspace } from "@/lib/auth/server";

export default async function BrandDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  const config = loadConfig();
  const userDb = createDb(config.db.url, "app_user");
  const adminDb = createDb(config.db.url, "app_admin");

  const brand = session.workspaceId ? await getBrand(userDb, session.workspaceId, id) : null;
  const assetsRaw = session.workspaceId
    ? await listBrandAssets(userDb, session.workspaceId, id)
    : [];

  if (!brand) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty__art">
            <I.AlertCircle size={28} />
          </div>
          <div className="empty__title">Brand not found</div>
          <div className="empty__sub">The requested brand could not be loaded.</div>
        </div>
      </div>
    );
  }

  const [genCountRow] = await adminDb
    .select({ value: count() })
    .from(generations)
    .where(eq(generations.brandId, id));
  const generationCount = Number(genCountRow?.value ?? 0);

  const storage = new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketApp,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey
      ? { secretAccessKey: config.storage.secretAccessKey }
      : {}),
  });

  const assets = await Promise.all(
    assetsRaw.map(async (a) => {
      let url: string | null = null;
      const s3Key = (a as { s3Key?: string }).s3Key;
      if (s3Key) {
        try {
          url = await storage.getSignedUrl(s3Key, 60 * 60);
        } catch {
          url = null;
        }
      }
      return {
        id: a.id,
        kind: a.kind,
        s3Key: s3Key ?? "",
        url,
      };
    }),
  );

  const brandRow = brand as unknown as {
    id: string;
    name: string;
    sourceUrl: string | null;
    voiceNotes: string | null;
    palette: BrandEditorBrand["palette"];
    fonts: BrandEditorBrand["fonts"];
    createdAt?: Date | null;
  };

  return (
    <BrandEditor
      brand={(() => {
        const base = {
          id: brandRow.id,
          name: brandRow.name,
          sourceUrl: brandRow.sourceUrl,
          voiceNotes: brandRow.voiceNotes,
          palette: brandRow.palette,
          fonts: brandRow.fonts,
          generationCount,
        };
        return brandRow.createdAt
          ? { ...base, createdAt: brandRow.createdAt.toISOString() }
          : base;
      })()}
      assets={assets}
    />
  );
}

type BrandEditorBrand = React.ComponentProps<typeof BrandEditor>["brand"];
