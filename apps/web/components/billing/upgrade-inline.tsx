"use client";

import { useState } from "react";

import { UpgradeModal } from "./upgrade-modal";

type Feature = "moods" | "stock" | "premium-quality" | "generic";

export function UpgradeInline({
  feature,
  label,
  buttonLabel = "Upgrade →",
}: {
  feature: Feature;
  label?: string;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="upgrade-inline">
        {label ? <>{label}{" "}</> : null}
        <button
          type="button"
          className="upgrade-inline__btn"
          onClick={() => setOpen(true)}
        >
          {buttonLabel}
        </button>
      </span>
      <UpgradeModal feature={feature} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
