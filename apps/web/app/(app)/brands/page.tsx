import Link from "next/link";

import { createDb, listBrands } from "@vyora/db";
import { loadConfig } from "@vyora/shared/config";

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
          <div className="t-eyebrow" style={{ color: "var(--studio-violet)", marginBottom: 6 }}>
            <I.Briefcase size={11} style={{ verticalAlign: "-1px" }} /> Brand kits
          </div>
          <h1 className="page__title">Brands</h1>
          <p className="page__sub">
            Your active brand kits, ready for generation and seasonal mood blending.
          </p>
        </div>
        <Link
          className="btn btn--accent"
          href="/brands/new/identify?new=1"
          style={{ textDecoration: "none" }}
        >
          <I.Plus size={14} />
          New brand
        </Link>
      </div>

      {brands.length === 0 ? (
        <div
          className="card card--elevated"
          style={{
            padding: 0,
            overflow: "hidden",
            background:
              "radial-gradient(ellipse 80% 80% at 50% 0%, #FBE5C2 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 100% 80%, #E8E7FA 0%, transparent 60%), white",
          }}
        >
          <div className="empty" style={{ padding: "80px 32px" }}>
            <div
              className="empty__art"
              style={{
                background: "linear-gradient(135deg, var(--studio-violet) 0%, #A8A5F0 100%)",
                color: "white",
              }}
            >
              <I.Briefcase size={32} />
            </div>
            <div className="empty__title">No brands yet</div>
            <div className="empty__sub">
              Spin up your first brand kit in 30 seconds — paste your URL and we&apos;ll
              do the rest.
            </div>
            <Link
              href="/brands/new/identify?new=1"
              className="btn btn--accent btn--lg"
              style={{ textDecoration: "none", marginTop: 8 }}
            >
              <I.Sparkle size={14} /> Create your first brand
            </Link>
          </div>
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
            const heroBg =
              palColors.length >= 2
                ? `linear-gradient(135deg, ${palColors[0]} 0%, ${palColors[1]} 100%)`
                : `linear-gradient(135deg, ${dot(brand.id)} 0%, var(--cal-charcoal) 100%)`;
            return (
              <Link
                key={brand.id}
                className="card"
                href={`/brands/${brand.id}`}
                style={{
                  padding: 0,
                  overflow: "hidden",
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 160ms, box-shadow 160ms",
                }}
              >
                <div
                  style={{
                    height: 88,
                    background: heroBg,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 16,
                      bottom: -22,
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: palColors[0] ?? dot(brand.id),
                      color: palColors[2] ?? "white",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      fontWeight: 600,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.18), 0 0 0 3px white",
                    }}
                  >
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div style={{ padding: "32px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
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
                    <div className="t-small" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <I.Globe size={11} style={{ color: "var(--fg-4)" }} />
                      {brand.sourceUrl ?? "No source URL"}
                    </div>
                  </div>
                  {palColors.length > 0 ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      {palColors.map((c, i) => (
                        <span
                          key={i}
                          title={c}
                          style={{
                            flex: 1,
                            height: 18,
                            borderRadius: 4,
                            background: c,
                            boxShadow: "var(--shadow-ring)",
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
