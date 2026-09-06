"use client";

import { useState } from "react";

import { I } from "@/components/icons";

import type { ProductRole, SelectedProduct } from "./types";

function toMinor(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

export function InlineProductEditor(props: {
  brandId: string;
  role?: ProductRole;
  onAdd: (product: SelectedProduct) => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [features, setFeatures] = useState("");
  const [saving, setSaving] = useState(false);

  const canAdd = name.trim().length > 0;

  async function addDraft() {
    if (!canAdd) return;
    const priceMinor = toMinor(price);
    const draft: SelectedProduct = {
      localId: `draft-${crypto.randomUUID()}`,
      source: "draft",
      role: props.role ?? "hero",
      commercialFields: {
        name: name.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(priceMinor != null ? { priceMinor, currency: "USD" } : {}),
        ...(discount.trim() ? { discountText: discount.trim() } : {}),
        ...(features.trim()
          ? {
              keyFeatures: features
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
                .slice(0, 8),
            }
          : {}),
      },
    };

    setSaving(true);
    try {
      if (props.brandId) {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            brandId: props.brandId,
            name: draft.commercialFields.name,
            title: draft.commercialFields.title,
            priceMinor: draft.commercialFields.priceMinor,
            currency: draft.commercialFields.currency ?? "USD",
            discountText: draft.commercialFields.discountText,
            keyFeatures: draft.commercialFields.keyFeatures ?? [],
            status: "draft",
          }),
        });
        if (response.ok) {
          const saved = (await response.json()) as { id?: string };
          if (saved.id) draft.productId = saved.id;
        }
      }
    } catch {
      // Local draft is enough for generation; persistence is best-effort in this flow.
    } finally {
      setSaving(false);
    }

    props.onAdd(draft);
    setName("");
    setTitle("");
    setPrice("");
    setDiscount("");
    setFeatures("");
  }

  return (
    <div className="cg-inline-editor">
      <div className="cg-field-row">
        <label>
          <span className="label">Product name</span>
          <input
            className="input"
            name="product_name"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nordic glow serum…"
          />
        </label>
        <label>
          <span className="label">Short title</span>
          <input
            className="input"
            name="product_short_title"
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Hydration that shows…"
          />
        </label>
      </div>
      <div className="cg-field-row cg-field-row--three">
        <label>
          <span className="label">Price</span>
          <input
            className="input"
            name="product_price"
            inputMode="decimal"
            autoComplete="off"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="29.00…"
          />
        </label>
        <label>
          <span className="label">Offer badge</span>
          <input
            className="input"
            name="product_offer_badge"
            autoComplete="off"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            placeholder="20% off…"
          />
        </label>
        <label>
          <span className="label">Key features</span>
          <input
            className="input"
            name="product_key_features"
            autoComplete="off"
            value={features}
            onChange={(event) => setFeatures(event.target.value)}
            placeholder="Vegan, fragrance free…"
          />
        </label>
      </div>
      <button
        type="button"
        className="btn btn--secondary"
        disabled={!canAdd || saving}
        onClick={() => void addDraft()}
      >
        <I.Plus size={15} />
        {saving ? "Saving Draft…" : "Add Product Draft"}
      </button>
    </div>
  );
}
