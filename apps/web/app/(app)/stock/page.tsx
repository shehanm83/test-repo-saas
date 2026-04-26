import { StockApi } from "@studio/api/stock";
import { loadConfig } from "@studio/shared";

export default async function StockPage() {
  const items = await new StockApi(loadConfig(), {} as never).adminList().catch(() => []);

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>Stock library</h1>
          <p>Reusable stock assets for moods, templates, and editorial references.</p>
        </div>
      </div>
      <div className="studio-stock-grid">
        {items.map((item) => (
          <article key={item.id} className="studio-stock-card">
            <div className="studio-stock-art" />
            <strong>{item.kind}</strong>
            <span>{item.tags.join(", ") || "untagged"}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
