"use client";

import { useState } from "react";

import { I } from "@/components/icons";

interface Member {
  id: string;
  email: string;
  role: string;
  acceptedAt: Date | null;
}

interface MemberActionsProps {
  members: Member[];
  currentUserId: string;
}

const ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof ROLES)[number];

export function MemberActions({ members, currentUserId }: MemberActionsProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<Record<string, Role>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/workspaces/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "Something went wrong");
      } else if ("idempotent" in data && data.idempotent) {
        setInviteSuccess("That user is already a member.");
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}.`);
        setInviteEmail("");
        setInviteRole("viewer");
        setTimeout(() => window.location.reload(), 800);
      }
    } catch {
      setInviteError("Network error — please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(member: Member) {
    const newRole = pendingRole[member.id] ?? (member.role as Role);
    if (newRole === member.role) return;
    setBusy((b) => ({ ...b, [member.id]: true }));
    try {
      const res = await fetch(`/api/workspaces/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to change role.");
        setBusy((b) => ({ ...b, [member.id]: false }));
      }
    } catch {
      alert("Network error — please try again.");
      setBusy((b) => ({ ...b, [member.id]: false }));
    }
  }

  async function handleRevoke(member: Member) {
    if (!confirm(`Remove ${member.email} from this workspace?`)) return;
    setBusy((b) => ({ ...b, [member.id]: true }));
    try {
      const res = await fetch(`/api/workspaces/members/${member.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to revoke member.");
        setBusy((b) => ({ ...b, [member.id]: false }));
      }
    } catch {
      alert("Network error — please try again.");
      setBusy((b) => ({ ...b, [member.id]: false }));
    }
  }

  const canManage = (member: Member) =>
    member.role !== "owner" && member.id !== currentUserId;

  return (
    <>
      {/* Invite row */}
      <tr style={{ borderTop: "1px solid var(--cal-gray-200)", background: "var(--cal-gray-50)" }}>
        <td colSpan={4} style={{ padding: "14px 24px" }}>
          <form
            onSubmit={handleInvite}
            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
          >
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              style={{
                flex: "1 1 220px",
                height: 32,
                padding: "0 10px",
                border: "1px solid var(--cal-gray-300)",
                borderRadius: 6,
                fontSize: 13,
                background: "white",
                color: "var(--fg-1)",
                outline: "none",
              }}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              style={{
                height: 32,
                padding: "0 8px",
                border: "1px solid var(--cal-gray-300)",
                borderRadius: 6,
                fontSize: 13,
                background: "white",
                color: "var(--fg-1)",
                cursor: "pointer",
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="btn btn--primary"
              style={{ height: 32, fontSize: 13, padding: "0 14px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <I.Plus size={11} />
              {inviting ? "Inviting…" : "Invite"}
            </button>
            {inviteError && (
              <span style={{ fontSize: 12, color: "var(--red-500, #ef4444)" }}>
                <I.AlertCircle size={11} style={{ verticalAlign: "-1px" }} /> {inviteError}
              </span>
            )}
            {inviteSuccess && (
              <span style={{ fontSize: 12, color: "var(--green-600, #16a34a)" }}>
                <I.Check size={11} style={{ verticalAlign: "-1px" }} /> {inviteSuccess}
              </span>
            )}
          </form>
        </td>
      </tr>

      {/* Per-member action rows */}
      {members.map((member) => (
        <tr key={member.id} style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
          <td style={{ padding: "12px 24px" }}>{member.email}</td>
          <td style={{ padding: "12px 24px" }}>
            {canManage(member) ? (
              <select
                value={pendingRole[member.id] ?? member.role}
                onChange={(e) =>
                  setPendingRole((p) => ({ ...p, [member.id]: e.target.value as Role }))
                }
                disabled={busy[member.id]}
                style={{
                  height: 28,
                  padding: "0 6px",
                  border: "1px solid var(--cal-gray-300)",
                  borderRadius: 6,
                  fontSize: 12,
                  background: "white",
                  color: "var(--fg-1)",
                  cursor: "pointer",
                }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="pill">{member.role}</span>
            )}
          </td>
          <td style={{ padding: "12px 24px" }}>
            {member.acceptedAt ? (
              <span className="pill pill--green">
                <I.Check size={11} /> Yes
              </span>
            ) : (
              <span className="pill pill--amber">Pending</span>
            )}
          </td>
          <td style={{ padding: "12px 24px" }}>
            {canManage(member) ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleRoleChange(member)}
                  disabled={
                    busy[member.id] ||
                    (pendingRole[member.id] ?? member.role) === member.role
                  }
                  className="btn btn--ghost"
                  style={{ height: 28, fontSize: 12, padding: "0 10px", display: "flex", alignItems: "center", gap: 4 }}
                  title="Save role"
                >
                  <I.Check size={11} />
                  Save
                </button>
                <button
                  onClick={() => handleRevoke(member)}
                  disabled={busy[member.id]}
                  className="btn btn--ghost"
                  style={{
                    height: 28,
                    fontSize: 12,
                    padding: "0 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--red-500, #ef4444)",
                  }}
                  title="Remove member"
                >
                  <I.Trash size={11} />
                  Remove
                </button>
              </div>
            ) : null}
          </td>
        </tr>
      ))}
    </>
  );
}
