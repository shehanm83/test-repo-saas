"use client";

import { useRef, useState } from "react";

import { I } from "@/components/icons";

import type { ProductLite, ProductRole, ProductSnapshot, SelectedProduct } from "./types";

function snapshotFromProduct(product: ProductLite): ProductSnapshot {
  return {
    name: product.name,
    ...(product.title ? { title: product.title } : {}),
    ...(product.subtitle ? { subtitle: product.subtitle } : {}),
    ...(product.description ? { description: product.description } : {}),
    ...(product.brandLabel ? { brandLabel: product.brandLabel } : {}),
    ...(product.model ? { model: product.model } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.category ? { category: product.category } : {}),
    ...(product.priceMinor != null ? { priceMinor: product.priceMinor } : {}),
    ...(product.compareAtPriceMinor != null ? { compareAtPriceMinor: product.compareAtPriceMinor } : {}),
    ...(product.currency ? { currency: product.currency } : {}),
    ...(product.discountText ? { discountText: product.discountText } : {}),
    ...(product.keyFeatures?.length ? { keyFeatures: product.keyFeatures } : {}),
    ...(product.benefits?.length ? { benefits: product.benefits } : {}),
    ...(product.targetAudience ? { targetAudience: product.targetAudience } : {}),
  };
}

function currencyLabel(product: ProductLite) {
  if (product.priceMinor == null) return product.discountText ?? "Saved product";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency ?? "USD",
  }).format(product.priceMinor / 100);
}

export function ProductPicker(props: {
  products: ProductLite[];
  selected: SelectedProduct[];
  role?: ProductRole;
  onAdd: (product: SelectedProduct) => void;
  onRemove: (localId: string) => void;
  onUpdateRole?: (localId: string, role: ProductRole) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const selectedProductIds = new Set(props.selected.map((item) => item.productId).filter(Boolean));

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadError(null);
    const previewUrl = URL.createObjectURL(file);
    const localId = `upload-${crypto.randomUUID()}`;
    props.onAdd({
      localId,
      source: "upload",
      role: props.role ?? "hero",
      previewUrl,
      uploadPending: true,
      commercialFields: { name: file.name.replace(/\.[^.]+$/, "") },
    });

    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/uploads/inspiration", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const json = (await response.json()) as { uploadId?: string };
      props.onAdd({
        localId,
        source: "upload",
        role: props.role ?? "hero",
        ...(json.uploadId ? { uploadId: json.uploadId } : {}),
        previewUrl,
        uploadPending: false,
        commercialFields: { name: file.name.replace(/\.[^.]+$/, "") },
      });
    } catch {
      setUploadError("Product image upload failed. The draft still stays in the form.");
      props.onAdd({
        localId,
        source: "upload",
        role: props.role ?? "hero",
        previewUrl,
        uploadPending: false,
        commercialFields: { name: file.name.replace(/\.[^.]+$/, "") },
      });
    }
  }

  return (
    <div className="cg-product-picker">
      <div className="cg-selected-products" aria-label="Selected products">
        {props.selected.length === 0 ? (
          <div className="cg-empty-inline">Add a saved product, draft, or product image.</div>
        ) : (
          props.selected.map((item) => (
            <div className="cg-selected-product" key={item.localId}>
              <div className="cg-thumb">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt="" />
                ) : (
                  <span>{(item.commercialFields.name ?? "P").slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div>
                <strong>{item.commercialFields.title ?? item.commercialFields.name ?? "Product"}</strong>
                <span>{item.source === "saved" ? "Saved product" : item.uploadPending ? "Uploading" : "Draft product"}</span>
              </div>
              {props.onUpdateRole ? (
                <select
                  className="select cg-role-select"
                  value={item.role}
                  aria-label={`Role for ${item.commercialFields.name ?? "product"}`}
                  onChange={(event) => props.onUpdateRole?.(item.localId, event.target.value as ProductRole)}
                >
                  <option value="hero">Hero</option>
                  <option value="bundle_item">Bundle</option>
                  <option value="catalogue_item">Catalogue</option>
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </select>
              ) : null}
              <button
                type="button"
                className="btn btn--icon btn--ghost"
                aria-label={`Remove ${item.commercialFields.name ?? "product"}`}
                onClick={() => props.onRemove(item.localId)}
              >
                <I.X size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="cg-upload-strip">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="cg-file-input"
          onChange={(event) => void onFiles(event.target.files)}
        />
        <button type="button" className="btn btn--secondary" onClick={() => inputRef.current?.click()}>
          <I.Upload size={15} />
          Upload product image
        </button>
        {uploadError ? <span className="cg-error-text">{uploadError}</span> : <span>PNG, JPG, or WebP up to 10 MB.</span>}
      </div>

      {props.products.length > 0 ? (
        <div className="cg-product-grid">
          {props.products.map((product) => {
            const selected = selectedProductIds.has(product.id);
            return (
              <button
                key={product.id}
                type="button"
                className={`cg-product-card ${selected ? "is-selected" : ""}`}
                disabled={selected}
                onClick={() =>
                  props.onAdd({
                    localId: `saved-${product.id}`,
                    source: "saved",
                    role: props.role ?? "hero",
                    productId: product.id,
                    commercialFields: snapshotFromProduct(product),
                  })
                }
              >
                <span className="cg-product-avatar">{product.name.slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{product.title ?? product.name}</strong>
                  <small>{currencyLabel(product)}</small>
                </span>
                {selected ? <I.Check size={16} /> : <I.Plus size={16} />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="cg-empty-inline">No saved products yet. Create a draft below to continue.</div>
      )}
    </div>
  );
}
