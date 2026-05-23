import Link from "next/link";
import React from "react";

import { I } from "@/components/icons";

import { AvatarMenu } from "./avatar-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

export function TopBar(props: {
  balance: number;
  email: string;
  authMode: "clerk" | "dev";
  isAdmin: boolean;
  workspaceId: string | null;
  workspaces: Array<{ id: string; name: string }>;
  activeWorkspaceName: string;
}) {
  return (
    <div className="topbar">
      <WorkspaceSwitcher
        workspaceId={props.workspaceId}
        workspaces={props.workspaces}
        activeWorkspaceName={props.activeWorkspaceName}
      />

      <div className="grow" />

      <Link href="/billing" className="topbar__credits" style={{ textDecoration: "none" }}>
        <I.Zap size={12} style={{ color: "var(--layertone-violet)" }} />
        <span>{props.balance.toLocaleString()} credits</span>
      </Link>

      <button className="btn btn--icon btn--ghost" type="button" title="Notifications">
        <I.Bell size={16} />
      </button>

      <AvatarMenu authMode={props.authMode} email={props.email} isAdmin={props.isAdmin} />
    </div>
  );
}
