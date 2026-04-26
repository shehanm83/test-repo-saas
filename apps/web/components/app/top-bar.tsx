import Link from "next/link";

import { AvatarMenu } from "./avatar-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

export function TopBar(props: {
  balance: number;
  email: string;
  isAdmin: boolean;
  workspaceId: string | null;
  workspaces: Array<{ id: string; name: string }>;
}) {
  return (
    <header className="studio-topbar">
      <Link className="studio-wordmark" href="/generate">
        <div className="studio-wordmark__mark">S</div>
        <span>Studio</span>
      </Link>

      <WorkspaceSwitcher workspaceId={props.workspaceId} workspaces={props.workspaces} />

      <div className="studio-topbar__spacer" />

      <Link className="studio-credit-pill" href="/billing">
        <strong>{props.balance.toLocaleString()}</strong>
        <span>credits</span>
      </Link>

      <AvatarMenu email={props.email} isAdmin={props.isAdmin} />
    </header>
  );
}

