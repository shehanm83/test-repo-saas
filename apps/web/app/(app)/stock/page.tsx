import { StockApi } from "@studio/api/stock";
import { loadConfig } from "@studio/shared";

import { I } from "@/components/icons";

export default async function StockPage() {
  const items = await new StockApi(loadConfig(), {} as never).adminList().catch(() => []);

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">Stock library</h1>
          <p className="page__sub">
            Reusable stock assets for moods, templates, and editorial references.
          </p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Image size={28} />
          </div>
          <div className="empty__title">No stock assets yet</div>
          <div className="empty__sub">
            Admins can upload stock from the admin → Stock area.
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
            <div key={item.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{ aspectRatio: "1/1", background: "var(--cal-gray-100)" }}
              />
              <div style={{ padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.kind}</div>
                <div className="t-small" style={{ marginTop: 2, fontSize: 11 }}>
                  {item.tags.join(", ") || "untagged"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
