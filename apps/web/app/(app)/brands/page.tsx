import Link from "next/link";

import { createDb, listBrands } from "@studio/db";
import { loadConfig } from "@studio/shared";

import { I } from "@/components/icons";
import { getSessionWorkspace } from "@/lib/auth/server";

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
function dot(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
}

export default async function BrandsPage() {
  const { session } = await getSessionWorkspace();
  const brands = session.workspaceId
    ? await listBrands(createDb(loadConfig().db.url, "app_user"), session.workspaceId)
    : [];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Brands</h1>
          <p className="page__sub">
            Your active brand kits, ready for generation and seasonal mood blending.
          </p>
        </div>
        <Link
          className="btn btn--accent"
          href="/onboarding/brand/identify"
          style={{ textDecoration: "none" }}
        >
          <I.Plus size={14} />
          New brand
        </Link>
      </div>

      {brands.length === 0 ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Briefcase size={28} />
          </div>
          <div className="empty__title">No brands yet</div>
          <div className="empty__sub">Spin up your first brand kit in 30 seconds.</div>
          <Link
            href="/onboarding/brand/identify"
            className="btn btn--accent"
            style={{ textDecoration: "none" }}
          >
            <I.Plus size={14} /> Create your first brand
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {brands.map((brand) => {
            const palette = brand.palette as
              | {
                  primary?: string;
                  secondary?: string;
                  accent?: string;
                  extras?: string[];
                }
              | null;
            const palColors = palette
              ? [palette.primary, palette.secondary, palette.accent, ...(palette.extras ?? [])]
                  .filter((c): c is string => Boolean(c))
                  .slice(0, 5)
              : [];
            return (
              <Link
                key={brand.id}
                className="card"
                href={`/brands/${brand.id}`}
                style={{
                  padding: 20,
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: dot(brand.id),
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {brand.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      color: "var(--fg-1)",
                    }}
                  >
                    {brand.name}
                  </div>
                  <div className="t-small" style={{ marginTop: 4 }}>
                    {brand.sourceUrl ?? "No source URL"}
                  </div>
                </div>
                {palColors.length > 0 ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    {palColors.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          background: c,
                          boxShadow: "var(--shadow-ring)",
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
