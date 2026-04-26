import { createDb, getBrand, listBrandAssets } from "@studio/db";
import { loadConfig } from "@studio/shared";

import { BrandEditor } from "@/components/brands/brand-editor";
import { getSessionWorkspace } from "@/lib/auth/server";

export default async function BrandDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  const db = createDb(loadConfig().db.url, "app_user");
  const brand = session.workspaceId ? await getBrand(db, session.workspaceId, id) : null;
  const assets = session.workspaceId ? await listBrandAssets(db, session.workspaceId, id) : [];

  if (!brand) {
    return (
      <div className="studio-page">
        <div className="studio-card studio-empty-card">
          <strong>Brand not found</strong>
          <p>The requested brand could not be loaded.</p>
        </div>
      </div>
    );
  }

  return <BrandEditor brand={brand as never} assets={assets as never} />;
}

