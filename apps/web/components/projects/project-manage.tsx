"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { I } from "@/components/icons";

export function ProjectManage({ projectId, currentName }: { projectId: string; currentName: string }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(currentName);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleRename() {
    if (!name.trim() || name.trim() === currentName) { setRenaming(false); return; }
    setPending("rename");
    setError(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setPending(null);
    if (res.ok) { router.refresh(); setRenaming(false); }
    else { const d = await res.json().catch(() => ({})) as { error?: string }; setError(d.error ?? "Failed"); }
  }

  async function handleDelete() {
    setPending("delete");
    setError(null);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setPending(null);
    if (res.ok) { router.push("/projects"); }
    else { const d = await res.json().catch(() => ({})) as { error?: string }; setError(d.error ?? "Failed"); setConfirmDelete(false); }
  }

  if (renaming) {
    return (
      <div className="row">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleRename(); if (e.key === "Escape") setRenaming(false); }}
          autoFocus
          style={{ minWidth: 200 }}
        />
        <button type="button" className="btn btn--primary btn--sm" onClick={() => void handleRename()} disabled={pending !== null}>
          {pending === "rename" ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRenaming(false)}>Cancel</button>
        {error ? <span className="t-small" style={{ color: "var(--layertone-red)" }}>{error}</span> : null}
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="row">
        <span className="t-small">Delete this project?</span>
        <button type="button" className="btn btn--secondary btn--danger btn--sm" onClick={() => void handleDelete()} disabled={pending !== null}>
          {pending === "delete" ? "Deleting…" : "Confirm delete"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
        {error ? <span className="t-small" style={{ color: "var(--layertone-red)" }}>{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="row">
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRenaming(true)}>
        <I.Edit size={13} /> Rename
      </button>
      <button type="button" className="btn btn--ghost btn--sm" style={{ color: "var(--layertone-red)" }} onClick={() => setConfirmDelete(true)}>
        <I.Trash size={13} /> Delete
      </button>
    </div>
  );
}
