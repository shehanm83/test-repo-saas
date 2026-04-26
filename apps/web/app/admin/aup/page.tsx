"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import { I } from "@/components/icons";

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
  const [messages, setMessages] = useState<{ ok: boolean; text: string }[]>([]);

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
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setMessages((p) => [
          { ok: false, text: `Suspend failed: ${String(data.error ?? "unknown")}` },
          ...p,
        ]);
      } else {
        setMessages((p) => [{ ok: true, text: `Workspace ${workspaceId} suspended.` }, ...p]);
        setItems((prev) =>
          prev.map((item) =>
            item.workspaceId === workspaceId && item.workspace
              ? { ...item, workspace: { ...item.workspace, status: "suspended" } }
              : item,
          ),
        );
      }
    } catch (err) {
      setMessages((p) => [{ ok: false, text: `Suspend error: ${String(err)}` }, ...p]);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">AUP enforcement</h1>
          <p className="page__sub">
            Generations flagged for Acceptable Use Policy review.
          </p>
        </div>
      </div>

      {messages.length > 0 ? (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`pill ${m.ok ? "pill--green" : "pill--red"}`}
              style={{ alignSelf: "flex-start" }}
            >
              {m.ok ? <I.Check size={11} /> : <I.AlertCircle size={11} />}
              {m.text}
            </div>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="t-small">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty card">
          <div className="empty__art">
            <I.Shield size={28} />
          </div>
          <div className="empty__title">No flagged generations</div>
          <div className="empty__sub">All clear.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => {
            const reason = (() => {
              if (!item.payload) return null;
              try {
                const parsed = JSON.parse(item.payload) as { reason?: string; tags?: string[] };
                return parsed.reason ?? parsed.tags?.join(", ") ?? item.payload;
              } catch {
                return item.payload;
              }
            })();
            return (
              <div
                key={item.auditId}
                className="card"
                style={{
                  padding: 20,
                  borderTop: "3px solid var(--studio-red)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-small mono" style={{ marginBottom: 6 }}>
                      <I.AlertTriangle
                        size={11}
                        style={{
                          verticalAlign: "-1px",
                          color: "var(--studio-red)",
                        }}
                      />{" "}
                      Flagged {new Date(item.flaggedAt).toLocaleString()}
                    </div>
                    {item.generation ? (
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                        {item.generation.brief}
                      </div>
                    ) : null}
                    {reason ? (
                      <div className="t-small" style={{ marginBottom: 6 }}>
                        Reason: {reason}
                      </div>
                    ) : null}
                    {item.workspace ? (
                      <div className="t-small">
                        Workspace:{" "}
                        <Link
                          href={`/admin/users/${item.workspace.id}`}
                          style={{ color: "var(--cal-link)", textDecoration: "underline" }}
                        >
                          {item.workspace.name}
                        </Link>
                        <span
                          className={`pill ${
                            item.workspace.status === "active"
                              ? "pill--green"
                              : item.workspace.status === "suspended"
                                ? "pill--red"
                                : "pill--amber"
                          }`}
                          style={{ marginLeft: 8 }}
                        >
                          {item.workspace.status}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    {item.generationId ? (
                      <Link
                        href={`/admin/generations/${item.generationId}`}
                        className="btn btn--secondary btn--sm"
                        style={{ textDecoration: "none" }}
                      >
                        Inspect
                      </Link>
                    ) : null}
                    {item.workspace && item.workspace.status !== "suspended" ? (
                      <button
                        type="button"
                        className="btn btn--secondary btn--danger btn--sm"
                        disabled={actionLoading !== null}
                        onClick={() =>
                          void suspendWorkspace(item.workspace!.id, item.generationId)
                        }
                      >
                        <I.Lock size={11} />
                        {actionLoading === item.workspace.id
                          ? "Suspending…"
                          : "Suspend"}
                      </button>
                    ) : (
                      <span className="t-small">Already suspended</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
