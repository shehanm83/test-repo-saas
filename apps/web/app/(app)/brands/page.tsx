import Link from "next/link";

import { createDb, listBrands } from "@studio/db";
import { loadConfig } from "@studio/shared";

import { getSessionWorkspace } from "@/lib/auth/server";

export default async function BrandsPage() {
  const { session } = await getSessionWorkspace();
  const brands = session.workspaceId
    ? await listBrands(createDb(loadConfig().db.url, "app_user"), session.workspaceId)
    : [];

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>Brands</h1>
          <p>Your active brand kits, ready for generation and seasonal mood blending.</p>
        </div>
        <Link className="studio-button studio-button--primary" href="/onboarding/brand/identify">
          New brand
        </Link>
      </div>

      <div className="studio-brand-grid">
        {brands.map((brand) => (
          <Link key={brand.id} className="studio-brand-card" href={`/brands/${brand.id}`}>
            <div className="studio-brand-card__mark">{brand.name.slice(0, 2).toUpperCase()}</div>
            <strong>{brand.name}</strong>
            <span>{brand.sourceUrl ?? "No source URL"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

