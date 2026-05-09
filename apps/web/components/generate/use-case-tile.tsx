"use client";

import React from "react";

interface Props {
  code: string;
  label: string;
  icon: string | null;
  platform: string | null;
  targetWidth: number;
  targetHeight: number;
  aspectRatio: string;
  active: boolean;
  onClick: () => void;
}

export function UseCaseTile(props: Props) {
  const { label, icon, platform, targetWidth, targetHeight, aspectRatio, active, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "14px 16px",
        background: active ? "var(--cal-blue-50, #eff6ff)" : "white",
        border: `1px solid ${active ? "var(--cal-blue-500, #3b82f6)" : "var(--cal-gray-200)"}`,
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 120ms, background 120ms",
        minHeight: 88,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{icon ?? "▦"}</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
      </div>
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--fg-3)",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span>{targetWidth}×{targetHeight}</span>
        <span>·</span>
        <span>{aspectRatio}</span>
        {platform ? (
          <>
            <span>·</span>
            <span>{platform}</span>
          </>
        ) : null}
      </div>
    </button>
  );
}
