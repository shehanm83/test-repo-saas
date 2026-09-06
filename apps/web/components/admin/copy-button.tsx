"use client";

import { useState } from "react";

import { I } from "@/components/icons";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="btn btn--ghost btn--sm"
      title={`Copy ${label ?? "value"}`}
      aria-label={copied ? "Copied" : `Copy ${label ?? "value"}`}
      style={{ gap: 4, fontFamily: "var(--font-mono)", fontSize: 12 }}
    >
      {copied ? <I.Check size={12} /> : <I.Copy size={12} />}
      {copied ? "Copied" : (label ?? value)}
    </button>
  );
}
