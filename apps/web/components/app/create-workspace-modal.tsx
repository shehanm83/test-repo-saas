"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { UpgradeModal } from "@/components/billing/upgrade-modal";

type State = "idle" | "submitting" | "limit-reached" | "error";

export function CreateWorkspaceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setState("idle");
      setName("");
      setErrorMsg("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  if (state === "limit-reached") {
    return <UpgradeModal feature="generic" open onClose={onClose} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setState("submitting");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = (await res.json()) as { workspaceId?: string; error?: string };
      if (!res.ok) {
        if (json.error === "workspace-limit") {
          setState("limit-reached");
          return;
        }
        setErrorMsg(
          json.error === "invalid-name"
            ? "Name must be 1–80 characters."
            : "Something went wrong. Please try again.",
        );
        setState("error");
        return;
      }
      await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: json.workspaceId }),
      });
      router.refresh();
      onClose();
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  const busy = state === "submitting";

  return (
    <div className="upgrade-overlay" onClick={onClose}>
      <div
        className="upgrade-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ws-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="upgrade-dialog__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <h2 id="create-ws-title" className="upgrade-dialog__headline">
          New workspace
        </h2>
        <p className="upgrade-dialog__desc">
          Each workspace has its own brands, credits, and billing.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="ws-name">
              Workspace name
            </label>
            <input
              id="ws-name"
              className="input"
              type="text"
              autoFocus
              autoComplete="off"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My workspace"
              disabled={busy}
            />
          </div>
          {state === "error" ? (
            <p className="upgrade-dialog__error">{errorMsg}</p>
          ) : null}
          <button
            type="submit"
            className="btn btn--accent upgrade-subscribe-btn"
            disabled={busy || !name.trim()}
          >
            {busy ? "Creating…" : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
