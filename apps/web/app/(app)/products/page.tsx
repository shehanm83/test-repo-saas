"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { I } from "@/components/icons";

type ProductLine = {
  id: string;
  name: string;
  brandId: string;
  category: string | null;
  status: string;
};

type Product = {
  id: string;
  name: string;
  brandId: string;
  productLineId: string | null;
  category: string | null;
  title: string | null;
  sku: string | null;
  status: string;
  priceMinor: number | null;
  currency: string;
};

type Brand = { id: string; name: string };

function formatPrice(minor: number | null, currency: string) {
  if (minor == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(minor / 100);
}

export default function ProductsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [brandsRes, linesRes, productsRes] = await Promise.all([
      fetch("/api/brands").then((r) => r.json()),
      fetch("/api/product-lines").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]);
    setBrands(Array.isArray(brandsRes) ? brandsRes : brandsRes.brands ?? []);
    setLines(Array.isArray(linesRes) ? linesRes : []);
    setProducts(Array.isArray(productsRes) ? productsRes : []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function archiveProduct(id: string) {
    setArchivingId(id);
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setArchivingId(null);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  const filteredProducts =
    filterBrand === "all" ? products : products.filter((p) => p.brandId === filterBrand);

  const filteredLines =
    filterBrand === "all" ? lines : lines.filter((l) => l.brandId === filterBrand);

  const ungrouped = filteredProducts.filter((p) => !p.productLineId);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div className="t-eyebrow" style={{ color: "var(--layertone-violet)", marginBottom: 6 }}>
            <I.Tag size={11} style={{ verticalAlign: "-1px" }} /> Product catalog
          </div>
          <h1 className="page__title">Products</h1>
          <p className="page__sub">
            Your product catalog, organized by brand and product line.
          </p>
        </div>
        <Link
          className="btn btn--accent"
          href="/generate"
          style={{ textDecoration: "none" }}
          title="Add products via the Generate form"
        >
          <I.Plus size={14} />
          Add product
        </Link>
      </div>

      {brands.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            className={`btn btn--sm ${filterBrand === "all" ? "btn--accent" : "btn--ghost"}`}
            onClick={() => setFilterBrand("all")}
          >
            All brands
          </button>
          {brands.map((b) => (
            <button
              key={b.id}
              className={`btn btn--sm ${filterBrand === b.id ? "btn--accent" : "btn--ghost"}`}
              onClick={() => setFilterBrand(b.id)}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>
          Loading products…
        </div>
      ) : filteredProducts.length === 0 ? (
        <div
          className="card card--elevated"
          style={{ padding: 0, overflow: "hidden" }}
        >
          <div className="empty" style={{ padding: "80px 32px" }}>
            <div className="empty__art" style={{ background: "linear-gradient(135deg, var(--layertone-violet) 0%, #A8A5F0 100%)", color: "white" }}>
              <I.Tag size={32} />
            </div>
            <div className="empty__title">No products yet</div>
            <div className="empty__sub">
              Add products from the Generate form when creating content, or via the Campaign Builder.
            </div>
            <Link href="/generate" className="btn btn--accent btn--lg" style={{ textDecoration: "none", marginTop: 8 }}>
              <I.Sparkle size={14} /> Go to Generate
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {filteredLines.map((line) => {
            const lineProducts = filteredProducts.filter((p) => p.productLineId === line.id);
            if (lineProducts.length === 0) return null;
            const brand = brands.find((b) => b.id === line.brandId);
            return (
              <div key={line.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <I.Layers size={14} style={{ color: "var(--fg-4)" }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{line.name}</span>
                  {line.category && (
                    <span className="t-small" style={{ color: "var(--fg-4)" }}>
                      · {line.category}
                    </span>
                  )}
                  {brand && (
                    <span
                      className="t-small"
                      style={{
                        marginLeft: "auto",
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "var(--surface-2)",
                        color: "var(--fg-3)",
                      }}
                    >
                      {brand.name}
                    </span>
                  )}
                </div>
                <ProductTable
                  products={lineProducts}
                  archivingId={archivingId}
                  onArchive={archiveProduct}
                />
              </div>
            );
          })}

          {ungrouped.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <I.Tag size={14} style={{ color: "var(--fg-4)" }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Ungrouped products</span>
              </div>
              <ProductTable
                products={ungrouped}
                archivingId={archivingId}
                onArchive={archiveProduct}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductTable({
  products,
  archivingId,
  onArchive,
}: {
  products: Product[];
  archivingId: string | null;
  onArchive: (id: string) => void;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-1)" }}>
          <th style={{ padding: "8px 20px", textAlign: "left", fontWeight: 500, color: "var(--fg-3)" }}>
            Name
          </th>
          <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 500, color: "var(--fg-3)" }}>
            SKU
          </th>
          <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 500, color: "var(--fg-3)" }}>
            Category
          </th>
          <th style={{ padding: "8px 16px", textAlign: "right", fontWeight: 500, color: "var(--fg-3)" }}>
            Price
          </th>
          <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 500, color: "var(--fg-3)" }}>
            Status
          </th>
          <th style={{ width: 40 }} />
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr
            key={p.id}
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <td style={{ padding: "10px 20px", fontWeight: 500 }}>
              {p.title ?? p.name}
              {p.title && p.title !== p.name && (
                <div className="t-small" style={{ color: "var(--fg-4)", fontWeight: 400 }}>
                  {p.name}
                </div>
              )}
            </td>
            <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
              {p.sku ?? "—"}
            </td>
            <td style={{ padding: "10px 16px", color: "var(--fg-3)" }}>
              {p.category ?? "—"}
            </td>
            <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--fg-2)" }}>
              {formatPrice(p.priceMinor, p.currency) ?? "—"}
            </td>
            <td style={{ padding: "10px 16px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  background: p.status === "active" ? "#D1FAE5" : "var(--surface-2)",
                  color: p.status === "active" ? "#065F46" : "var(--fg-3)",
                }}
              >
                {p.status}
              </span>
            </td>
            <td style={{ padding: "10px 16px", textAlign: "right" }}>
              <button
                className="btn btn--ghost btn--sm btn--icon"
                title="Archive product"
                disabled={archivingId === p.id}
                onClick={() => onArchive(p.id)}
                style={{ color: "var(--fg-4)" }}
              >
                <I.Trash size={13} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
