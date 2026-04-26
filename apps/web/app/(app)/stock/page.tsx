import { StockApi } from "@studio/api/stock";
import { loadConfig } from "@studio/shared";

import { I } from "@/components/icons";

export default async function StockPage() {
  const items = await new StockApi(loadConfig(), {} as never).adminList().catch(() => []);

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <div
            className="t-eyebrow"
            style={{ color: "var(--studio-violet)", marginBottom: 6 }}
          >
            <I.Image size={11} style={{ verticalAlign: "-1px" }} /> Reference assets
          </div>
          <h1 className="page__title">Stock library</h1>
          <p className="page__sub">
            Curated stock used by moods, templates, and editorial references.
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
          {items.map((item) => (
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
                  background:
                    "linear-gradient(135deg, var(--cal-gray-100) 0%, var(--cal-gray-200) 100%)",
                }}
              />
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
                      <span
                        key={t}
                        className="pill"
                        style={{ height: 18, fontSize: 10 }}
                      >
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
