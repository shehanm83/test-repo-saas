"use client";

import { InlineProductEditor } from "./inline-product-editor";
import { ProductPicker } from "./product-picker";
import type { ProductLite, ProductRole, SelectedProduct } from "./types";

export function ProductStep(props: {
  products: ProductLite[];
  selected: SelectedProduct[];
  brandId: string;
  role?: ProductRole;
  onAdd: (product: SelectedProduct) => void;
  onRemove: (localId: string) => void;
  onUpdateRole?: (localId: string, role: ProductRole) => void;
}) {
  const roleProps = props.role ? { role: props.role } : {};
  const updateRoleProps = props.onUpdateRole ? { onUpdateRole: props.onUpdateRole } : {};

  return (
    <div className="cg-step-stack">
      <ProductPicker
        products={props.products}
        selected={props.selected}
        {...roleProps}
        onAdd={props.onAdd}
        onRemove={props.onRemove}
        {...updateRoleProps}
      />
      <InlineProductEditor brandId={props.brandId} {...roleProps} onAdd={props.onAdd} />
    </div>
  );
}
