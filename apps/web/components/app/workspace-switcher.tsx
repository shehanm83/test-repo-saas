"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function WorkspaceSwitcher(props: {
  workspaceId: string | null;
  workspaces: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(props.workspaceId ?? "");

  async function onChange(nextWorkspaceId: string) {
    setValue(nextWorkspaceId);
    await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: nextWorkspaceId }),
    });
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <label className="studio-workspace-pill">
      <span className="studio-workspace-pill__dot" />
      <select
        aria-label="Workspace"
        className="studio-select-reset"
        disabled={isPending}
        value={value}
        onChange={(event) => void onChange(event.target.value)}
      >
        {props.workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </label>
  );
}

