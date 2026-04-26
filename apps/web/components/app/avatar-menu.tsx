import Link from "next/link";

export function AvatarMenu(props: { email: string; isAdmin: boolean }) {
  return (
    <details className="studio-menu-root">
      <summary className="studio-avatar-button">{props.email.slice(0, 2).toUpperCase()}</summary>
      <div className="studio-menu-card">
        <div className="studio-menu-meta">
          <strong>{props.email}</strong>
          <span>{props.isAdmin ? "Admin access enabled" : "Workspace member"}</span>
        </div>
        <Link href="/settings">Settings</Link>
        <Link href="/billing">Billing</Link>
        {props.isAdmin ? <Link href="/admin/moods">Admin</Link> : null}
      </div>
    </details>
  );
}

