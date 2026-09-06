"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";

import { ProductPicker } from "@/components/generate/commercial/product-picker";
import { InlineProductEditor } from "@/components/generate/commercial/inline-product-editor";
import type {
  ProductLite,
  ProductRole,
  SelectedProduct,
} from "@/components/generate/commercial/types";

/** Deterministic swatch so a product looks the same everywhere in the campaign. */
function swatchFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `linear-gradient(140deg, hsl(${hue} 42% 34%), hsl(${(hue + 26) % 360} 46% 62%))`;
}

function labelFor(product: SelectedProduct): string {
  return product.commercialFields.name ?? product.commercialFields.title ?? "Product";
}

export function ProductChips(props: {
  brandId: string;
  products: ProductLite[];
  selected: SelectedProduct[];
  onChange: (selected: SelectedProduct[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function add(product: SelectedProduct) {
    // The picker re-emits an upload once its id resolves — replace in place so
    // the chip does not jump to the end of the row.
    const existing = props.selected.findIndex((item) => item.localId === product.localId);
    if (existing >= 0) {
      props.onChange(props.selected.map((item, index) => (index === existing ? product : item)));
      return;
    }
    props.onChange([...props.selected, product]);
  }

  function remove(localId: string) {
    props.onChange(props.selected.filter((item) => item.localId !== localId));
  }

  function updateRole(localId: string, role: ProductRole) {
    props.onChange(
      props.selected.map((item) => (item.localId === localId ? { ...item, role } : item)),
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {props.selected.map((product) => (
          <span
            key={product.localId}
            className="flex items-center gap-2.5 rounded-full bg-white py-[7px] pl-[7px] pr-3.5 text-[13px] font-medium shadow-card"
          >
            <span
              className="h-[26px] w-[26px] flex-none overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
              style={product.previewUrl ? undefined : { background: swatchFor(product.localId) }}
            >
              {product.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.previewUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </span>
            {labelFor(product)}
            <button
              type="button"
              className="-mr-1 grid h-5 w-5 place-items-center rounded-full text-ink-soft/50 transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label={`Remove ${labelFor(product)}`}
              onClick={() => remove(product.localId)}
            >
              <X size={13} strokeWidth={2.4} />
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full px-3.5 py-[7px] text-[13px] font-medium text-ink-soft shadow-[inset_0_0_0_1px_rgba(17,17,17,0.12)] transition-colors hover:bg-ink/3 hover:text-ink"
        >
          <Plus size={13} strokeWidth={2.2} />
          Add product
        </button>
      </div>

      {open && mounted
        ? createPortal(
            <>
              <div className="scrim" aria-hidden="true" onClick={() => setOpen(false)} />
              <div
                className="modal !w-[min(720px,calc(100vw-32px))]"
                role="dialog"
                aria-modal="true"
                aria-label="Add products to the campaign"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft/70">
                      Campaign products
                    </span>
                    <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
                      What is this campaign about?
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setOpen(false)}
                  >
                    <X size={15} />
                    Done
                  </button>
                </div>
                <ProductPicker
                  products={props.products}
                  selected={props.selected}
                  onAdd={add}
                  onRemove={remove}
                  onUpdateRole={updateRole}
                />
                <div className="mt-4 border-t border-ink/10 pt-4">
                  <InlineProductEditor brandId={props.brandId} onAdd={add} />
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
