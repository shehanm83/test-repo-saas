import { Ledger } from "@studio/billing";
import { createDb, listBrands } from "@studio/db";
import { loadConfig } from "@studio/shared";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export async function AppFrame(props: {
  session: {
    userId: string;
    workspaceId: string | null;
    email: string;
    role: "user" | "admin";
    workspaces: Array<{ id: string; name: string; role: string; planCode: string; status: string }>;
  };
  children: React.ReactNode;
}) {
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");
  const balance = props.session.workspaceId
    ? await new Ledger(db).getBalance(props.session.workspaceId)
    : 0;
  const brands = props.session.workspaceId ? await listBrands(db, props.session.workspaceId) : [];
  const activeWorkspace =
    props.session.workspaces.find((workspace) => workspace.id === props.session.workspaceId) ??
    props.session.workspaces[0] ??
    null;

  return (
    <main className="studio-app-shell">
      <TopBar
        balance={balance}
        email={props.session.email}
        isAdmin={props.session.role === "admin"}
        workspaceId={props.session.workspaceId}
        workspaces={props.session.workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
        }))}
      />

      <div className="studio-frame">
        <Sidebar
          brands={brands.map((brand) => ({ id: brand.id, name: brand.name }))}
          workspaceName={activeWorkspace?.name ?? "Workspace"}
          planCode={activeWorkspace?.planCode ?? "free"}
        />
        <section className="studio-main">{props.children}</section>
      </div>
    </main>
  );
}

