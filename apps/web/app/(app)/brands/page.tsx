import Link from "next/link";

import { createDb, listBrands } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

import { I } from "@/components/icons";
import { getSessionWorkspace } from "@/lib/auth/server";

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
function dot(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
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

export default async function BrandsPage() {
  const { session } = await getSessionWorkspace();
  const config = loadConfig();
  const brandRows = session.workspaceId
    ? await listBrands(createDb(config.db.url, "app_user"), session.workspaceId)
    : [];
  const storage = createStorage(config);
  const brands = await Promise.all(
    brandRows.map(async (brand) => {
      if (!brand.logoS3Key) return { ...brand, logoUrl: null };
      try {
        return { ...brand, logoUrl: await storage.getSignedUrl(brand.logoS3Key, 60 * 60) };
      } catch {
        return { ...brand, logoUrl: null };
      }
    }),
  );

  return (
    <div className="page page--wide brand-page">
      <div className="brand-hero">
        <div>
          <div className="brand-hero__eyebrow">
            <I.Briefcase size={12} /> Brand Kits
          </div>
          <h1>Brand Library</h1>
          <p>Your identity systems, palettes, logos, and voice notes for production generation.</p>
          <div className="brand-hero__stats" aria-label="Brand summary">
            <span>
              <strong>{brands.length}</strong> Active Brands
            </span>
            <span>
              <strong>{brands.filter((brand) => brand.sourceUrl).length}</strong> With Source URL
            </span>
          </div>
        </div>
        <Link className="btn btn--accent btn--lg" href="/brands/new">
          <I.Plus size={14} />
          New Brand
        </Link>
      </div>

      {brands.length === 0 ? (
        <div className="brand-empty">
          <div className="empty">
            <div className="brand-empty__art">
              <I.Briefcase size={32} />
            </div>
            <div className="empty__title">No Brands Yet</div>
            <div className="empty__sub">
              Create your first brand kit, then use its colors, logo, fonts, and voice in every
              generation.
            </div>
            <Link href="/brands/new" className="btn btn--accent btn--lg">
              <I.Sparkle size={14} /> Create First Brand
            </Link>
          </div>
        </div>
      ) : (
        <div className="brand-grid">
          {brands.map((brand) => {
            const palette = brand.palette as {
              primary?: string;
              secondary?: string;
              accent?: string;
              extras?: string[];
            } | null;
            const palColors = palette
              ? [palette.primary, palette.secondary, palette.accent, ...(palette.extras ?? [])]
                  .filter((c): c is string => Boolean(c))
                  .slice(0, 5)
              : [];
            const heroBg =
              palColors.length >= 2
                ? `linear-gradient(135deg, ${palColors[0]} 0%, ${palColors[1]} 100%)`
                : `linear-gradient(135deg, ${dot(brand.id)} 0%, var(--cal-charcoal) 100%)`;
            return (
              <Link key={brand.id} className="brand-card" href={`/brands/${brand.id}`}>
                <div className="brand-card__cover" style={{ background: heroBg }}>
                  {brand.logoUrl ? (
                    <span className="brand-card__logo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={brand.logoUrl} alt={`${brand.name} logo`} />
                    </span>
                  ) : (
                    <span
                      className="brand-card__mark"
                      style={{
                        background: palColors[0] ?? dot(brand.id),
                        color: palColors[2] ?? "white",
                      }}
                    >
                      <span translate="no">{brand.name.slice(0, 2).toUpperCase()}</span>
                    </span>
                  )}
                </div>
                <div
                  className={`brand-card__body ${brand.logoUrl ? "brand-card__body--with-logo" : ""}`}
                >
                  <div className="brand-card__title-row">
                    <h2>{brand.name}</h2>
                    <I.ArrowRight size={15} />
                  </div>
                  <div className="brand-card__url">
                    <I.Globe size={12} />
                    <span>{brand.sourceUrl ?? "No Source URL"}</span>
                  </div>
                  {palColors.length > 0 ? (
                    <div className="brand-card__palette" aria-label={`${brand.name} palette`}>
                      {palColors.map((c, i) => (
                        <span key={i} title={c} style={{ background: c }} />
                      ))}
                    </div>
                  ) : null}
                  <div className="brand-card__meta">
                    <span>{palColors.length || 0} Colors</span>
                    <span>Ready for Generate</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
