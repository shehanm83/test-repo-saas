import { billingSegmentFor } from "@layertone/billing";
import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";

import { I } from "@/components/icons";
import { getSessionWorkspace } from "@/lib/auth/server";
import { createGlobalStorageAdapter } from "@/lib/server/adapters";
import { UpgradeInline } from "@/components/billing/upgrade-inline";

export default async function StockPage() {
  const { workspace } = await getSessionWorkspace();
  const isFree = billingSegmentFor(workspace?.planCode) === "free";
  const allItems = await new StockApi(loadConfig(), {} as never).adminList().catch(() => []);
  const items = isFree ? allItems.slice(0, 6) : allItems;
  const storage = createGlobalStorageAdapter();
  const itemsWithUrls = await Promise.all(
    items.map(async (item) => ({
      ...item,
      url: await storage.getSignedUrl(item.s3Key, 60 * 60).catch(() => null),
    })),
  );

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <div className="t-eyebrow" style={{ color: "var(--layertone-violet)", marginBottom: 6 }}>
            <I.Image size={11} style={{ verticalAlign: "-1px" }} /> Reference assets
          </div>
          <h1 className="page__title">Stock library</h1>
          <p className="page__sub">
            {isFree ? (
              <>
                Free workspaces can preview a limited stock set.{" "}
                <UpgradeInline feature="stock" buttonLabel="Unlock the full library →" />
              </>
            ) : (
              "Curated stock used by moods, templates, and editorial references."
            )}
          </p>
        </div>
      </div>
      {items.length === 0 ? (
        <div
          className="card card--elevated"
          style={{
            padding: 0,
            overflow: "hidden",
            background:
              "radial-gradient(ellipse 80% 80% at 50% 0%, #FFE5C7 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 100% 80%, #E8E7FA 0%, transparent 60%), white",
          }}
        >
          <div className="empty" style={{ padding: "80px 32px" }}>
            <div
              className="empty__art"
              style={{
                background: "linear-gradient(135deg, #C97A3F 0%, #E8C66B 100%)",
                color: "white",
              }}
            >
              <I.Image size={32} />
            </div>
            <div className="empty__title">No stock assets yet</div>
            <div className="empty__sub">
              Admins can upload stock from the admin → Stock area to seed the library.
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {itemsWithUrls.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: 0,
                overflow: "hidden",
                transition: "transform 160ms",
              }}
            >
              <div
                style={{
                  aspectRatio: "1/1",
                  background: "var(--cal-gray-100)",
                  overflow: "hidden",
                }}
              >
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.kind}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
              </div>
              <div style={{ padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.kind}</div>
                <div
                  className="t-small"
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                  }}
                >
                  {item.tags.length === 0 ? (
                    <span style={{ color: "var(--fg-4)" }}>untagged</span>
                  ) : (
                    item.tags.map((t) => (
                      <span key={t} className="pill" style={{ height: 18, fontSize: 10 }}>
                        {t}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
