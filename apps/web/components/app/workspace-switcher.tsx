"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState, useTransition } from "react";

import { I } from "@/components/icons";

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
function dotColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
}

export function WorkspaceSwitcher(props: {
  workspaceId: string | null;
  workspaces: Array<{ id: string; name: string }>;
  activeWorkspaceName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function pick(nextWorkspaceId: string) {
    setOpen(false);
    if (nextWorkspaceId === props.workspaceId) return;
    await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: nextWorkspaceId }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="workspace-switcher"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
      >
        <span
          className="workspace-switcher__dot"
          style={{
            background: props.workspaceId ? dotColor(props.workspaceId) : "var(--cal-gray-300)",
          }}
        />
        <span style={{ fontWeight: 500, fontSize: 14 }}>{props.activeWorkspaceName}</span>
        <I.ChevronDown size={14} style={{ color: "var(--fg-3)" }} />
      </button>
      {open ? (
        <div
          className="menu"
          style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 240 }}
        >
          <div
            style={{
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--fg-4)",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Workspaces
          </div>
          {props.workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              className="menu-item"
              onClick={() => void pick(w.id)}
              style={{ width: "100%", textAlign: "left" }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 100,
                  background: dotColor(w.id),
                  flexShrink: 0,
                }}
              />
              <span>{w.name}</span>
              {w.id === props.workspaceId ? (
                <I.Check
                  size={14}
                  style={{ marginLeft: "auto", color: "var(--fg-1)" }}
                />
              ) : null}
            </button>
          ))}
          <div className="menu-divider" />
          <button type="button" className="menu-item" style={{ width: "100%", textAlign: "left" }}>
            <I.Plus size={14} /> Create new workspace
          </button>
        </div>
      ) : null}
    </div>
  );
}
