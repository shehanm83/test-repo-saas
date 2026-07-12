import Link from "next/link";
import React from "react";
import { Bell, Zap } from "lucide-react";

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
    <div className="flex h-full items-center gap-3 px-5 pr-8 font-sans">
      <WorkspaceSwitcher
        workspaceId={props.workspaceId}
        workspaces={props.workspaces}
        activeWorkspaceName={props.activeWorkspaceName}
      />

      <div className="grow" />

      <Link
        href="/billing"
        className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink shadow-pill transition-transform duration-150 hover:-translate-y-px"
      >
        <Zap size={13} className="fill-brand text-brand" />
        <span>{props.balance.toLocaleString()} credits</span>
      </Link>

      <button
        className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
        type="button"
        title="Notifications"
      >
        <Bell size={16} strokeWidth={2} />
      </button>

      <AvatarMenu authMode={props.authMode} email={props.email} isAdmin={props.isAdmin} />
    </div>
  );
}
