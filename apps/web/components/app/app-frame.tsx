import React from "react";

import { Ledger } from "@layertone/billing";
import { createDb, listBrands } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { AppShell } from "./app-shell";
import { Sidebar } from "./sidebar";

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
    <AppShell
      sidebar={
        <Sidebar
          brands={brands.map((b) => ({ id: b.id, name: b.name }))}
          planCode={activeWorkspace?.planCode ?? "free"}
          balance={balance}
          email={props.session.email}
          authMode={config.auth.mode}
          isAdmin={props.session.role === "admin"}
          workspaceId={props.session.workspaceId}
          workspaces={props.session.workspaces.map((w) => ({ id: w.id, name: w.name }))}
          activeWorkspaceName={activeWorkspace?.name ?? "Workspace"}
        />
      }
    >
      {props.children}
    </AppShell>
  );
}
