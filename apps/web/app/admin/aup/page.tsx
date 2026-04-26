"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface FlaggedItem {
  auditId: string;
  generationId: string | null;
  workspaceId: string;
  actorUserId: string | null;
  payload: string | null;
  flaggedAt: string;
  generation: {
    id: string;
    brief: string;
    status: string;
    createdAt: string;
  } | null;
  workspace: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export default function AdminAupPage() {
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  function addMessage(msg: string) {
    setMessages((prev) => [msg, ...prev]);
  }

  useEffect(() => {
    fetch("/api/admin/aup")
      .then((r) => r.json() as Promise<{ flagged: FlaggedItem[] }>)
      .then((data) => {
        setItems(data.flagged);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function suspendWorkspace(workspaceId: string, generationId: string | null) {
    setActionLoading(workspaceId);
    try {
      const res = await fetch(`/api/admin/aup/${workspaceId}/suspend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "AUP violation", generationId }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        addMessage(`Suspend failed: ${String(data.error ?? "unknown")}`);
      } else {
        addMessage(`Workspace ${workspaceId} suspended.`);
        // Update local state
        setItems((prev) =>
          prev.map((item) =>
            item.workspaceId === workspaceId && item.workspace
              ? { ...item, workspace: { ...item.workspace, status: "suspended" } }
              : item,
          ),
        );
      }
    } catch (err) {
      addMessage(`Suspend error: ${String(err)}`);
    } finally {
      setActionLoading(null);
    }
  }

  const statusColors: Record<string, string> = {
    active: "#d1fae5",
    suspended: "#fee2e2",
    read_only: "#fef3c7",
  };

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>AUP Enforcement</h1>
          <p>Generations flagged for Acceptable Use Policy review.</p>
        </div>
      </div>

      {messages.length > 0 && (
        <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {messages.map((msg, i) => (
            <p
              key={i}
              style={{
                fontSize: "0.75rem",
                padding: "0.375rem 0.625rem",
                background: msg.includes("failed") || msg.includes("error") ? "#fee2e2" : "#d1fae5",
                borderRadius: "0.25rem",
                color: msg.includes("failed") || msg.includes("error") ? "#991b1b" : "#065f46",
              }}
            >
              {msg}
            </p>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No flagged generations.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {items.map((item) => (
            <div
              key={item.auditId}
              style={{
                border: "1px solid #fca5a5",
                borderRadius: "0.5rem",
                padding: "1rem",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                    Flagged {new Date(item.flaggedAt).toLocaleString()}
                  </p>
                  {item.generation && (
                    <p style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>
                      Brief: {item.generation.brief}
                    </p>
                  )}
                  {item.payload && (
                    <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      Reason: {(() => {
                        try { return (JSON.parse(item.payload) as { reason?: string }).reason ?? item.payload; }
                        catch { return item.payload; }
                      })()}
                    </p>
                  )}
                  {item.workspace && (
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      Workspace:{" "}
                      <Link href={`/admin/users/${item.workspace.id}`} style={{ color: "#1d4ed8", textDecoration: "underline" }}>
                        {item.workspace.name}
                      </Link>
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          padding: "0.125rem 0.375rem",
                          borderRadius: "9999px",
                          fontSize: "0.625rem",
                          fontWeight: 600,
                          background: statusColors[item.workspace.status] ?? "#f3f4f6",
                          color: "#374151",
                        }}
                      >
                        {item.workspace.status}
                      </span>
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
                  {item.generationId && (
                    <Link
                      href={`/admin/generations/${item.generationId}`}
                      style={{
                        padding: "0.375rem 0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        background: "#f9fafb",
                        color: "#374151",
                        fontSize: "0.75rem",
                        textDecoration: "none",
                        textAlign: "center",
                      }}
                    >
                      Inspect generation
                    </Link>
                  )}
                  {item.workspace && item.workspace.status !== "suspended" && (
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => void suspendWorkspace(item.workspace!.id, item.generationId)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #fca5a5",
                        background: actionLoading === null ? "#fee2e2" : "#f3f4f6",
                        color: actionLoading === null ? "#991b1b" : "#9ca3af",
                        cursor: actionLoading === null ? "pointer" : "not-allowed",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                      }}
                    >
                      {actionLoading === item.workspace.id ? "Suspending…" : "Suspend workspace"}
                    </button>
                  )}
                  {item.workspace?.status === "suspended" && (
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af", textAlign: "center" }}>
                      Already suspended
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
