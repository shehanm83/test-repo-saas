"use client";

import React from "react";

/**
 * The small labelled box the mockup uses for dates and offer terms: a caps
 * micro-label stacked over the value, on a white card pill.
 */
export function FieldBox(props: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`block rounded-xl bg-white px-3.5 py-2.5 shadow-card focus-within:shadow-[0_0_0_1px_var(--color-brand),0_0_0_4px_var(--color-brand-50)] ${props.className ?? ""}`}
    >
      <span className="mb-0.5 block font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-soft/70">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}

/** Bare input used inside a FieldBox — the box owns the chrome. */
export const BOX_INPUT =
  "block w-full border-0 bg-transparent p-0 text-[13.5px] font-medium text-ink outline-none placeholder:text-ink-soft/40";
