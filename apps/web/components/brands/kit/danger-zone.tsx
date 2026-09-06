"use client";

import { useState } from "react";

export function DangerZone(props: { brandName: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const matches = confirmation.trim() === props.brandName.trim();

  return (
    <div className="rounded-2xl border border-[#e4c9c1] bg-[#fdf6f4] p-4">
      <p className="text-[13px] font-medium text-ink">Delete this brand</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
        Its logos, references, colours and voice go with it. Generations made with this brand keep
        their images but lose the link.
      </p>

      {open ? (
        <div className="mt-3 grid gap-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] text-ink-soft">
              Type <strong className="text-ink">{props.brandName}</strong> to confirm
            </span>
            <input
              className="input max-w-[320px] text-[13px]"
              value={confirmation}
              aria-label="Confirm brand name"
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn--sm bg-[#b4352a] text-white disabled:opacity-45"
              disabled={!matches}
              onClick={props.onDelete}
            >
              Delete permanently
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setOpen(false);
                setConfirmation("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--secondary btn--sm mt-3"
          onClick={() => setOpen(true)}
        >
          Delete brand
        </button>
      )}
    </div>
  );
}
