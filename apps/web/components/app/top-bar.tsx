import Link from "next/link";
import React from "react";

import { I } from "@/components/icons";

import { AvatarMenu } from "./avatar-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

export function TopBar(props: {
  balance: number;
  email: string;
  isAdmin: boolean;
  workspaceId: string | null;
  workspaces: Array<{ id: string; name: string }>;
  activeWorkspaceName: string;
}) {
  return (
    <div className="topbar">
      <Link href="/generate" className="topbar__brand" style={{ cursor: "pointer" }}>
        <div className="topbar__brand-mark">
          <span style={{ marginTop: -1 }}>S</span>
        </div>
        <span>Studio</span>
      </Link>

      <div className="divider-y" style={{ height: 24 }} />

      <WorkspaceSwitcher
        workspaceId={props.workspaceId}
        workspaces={props.workspaces}
        activeWorkspaceName={props.activeWorkspaceName}
      />

      <div className="grow" />

      <Link
        href="/billing"
        className="pill pill--ring"
        style={{ height: 30, paddingRight: 4, gap: 6, textDecoration: "none" }}
      >
        <I.Zap size={12} style={{ color: "var(--studio-violet)" }} />
        <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>
          {props.balance.toLocaleString()}
        </span>
        <span style={{ color: "var(--fg-3)" }}>credits</span>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            display: "grid",
            placeItems: "center",
            background: "var(--cal-gray-100)",
            marginLeft: 4,
          }}
        >
          <I.Plus size={12} />
        </span>
      </Link>

      <button className="btn btn--icon btn--ghost" type="button" title="Notifications">
        <I.Bell size={16} />
      </button>

      <AvatarMenu email={props.email} isAdmin={props.isAdmin} />
    </div>
  );
}
