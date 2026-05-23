import { Ledger, PLANS } from "@layertone/billing";
import { createDb } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { I } from "@/components/icons";
import { listWorkspaceMembers, getSessionWorkspace } from "@/lib/auth/server";

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div>
      <div className="t-eyebrow" style={{ color: accent ?? "var(--fg-3)" }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 32,
          fontWeight: 600,
          color: "var(--fg-1)",
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const { session, workspace } = await getSessionWorkspace();
  const members = workspace ? await listWorkspaceMembers(workspace.id) : [];
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");
  const balance = workspace ? await new Ledger(db).getBalance(workspace.id) : 0;
  const planCode = (workspace?.planCode ?? "free") as keyof typeof PLANS;
  const plan = PLANS[planCode];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div
            className="t-eyebrow"
            style={{ color: "var(--layertone-violet)", marginBottom: 6 }}
          >
            <I.Settings size={11} style={{ verticalAlign: "-1px" }} /> Workspace settings
          </div>
          <h1 className="page__title">Settings &amp; members</h1>
          <p className="page__sub">
            Workspace profile, plan status, and current member access.
          </p>
        </div>
      </div>

      <div
        className="card card--elevated"
        style={{
          padding: 0,
          overflow: "hidden",
          marginBottom: 16,
          background:
            "radial-gradient(ellipse 60% 80% at 0% 0%, #E8E7FA 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 100% 100%, #FFE5C7 0%, transparent 60%), white",
        }}
      >
        <div
          style={{
            padding: 28,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>
              Active workspace
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, var(--layertone-violet) 0%, #B5B4F2 100%)",
                  color: "white",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 600,
                  boxShadow: "0 4px 16px rgba(94,92,230,0.3)",
                }}
              >
                {(workspace?.name ?? "??").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  {workspace?.name ?? "No active workspace"}
                </div>
                <div
                  className="t-small"
                  style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}
                >
                  <I.User size={11} /> {session.email}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="pill pill--accent">
              <I.Crown size={11} />
              {planCode.toUpperCase()}
            </span>
            <span
              className={`pill ${
                (workspace?.status ?? "active") === "active"
                  ? "pill--green"
                  : (workspace?.status ?? "") === "suspended"
                    ? "pill--red"
                    : "pill--amber"
              }`}
            >
              {workspace?.status ?? "active"}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: "1px solid var(--cal-gray-200)",
            background: "rgba(255,255,255,0.6)",
          }}
        >
          <div style={{ padding: "20px 28px", borderRight: "1px solid var(--cal-gray-200)" }}>
            <Stat label="Credits" value={balance.toLocaleString()} accent="var(--layertone-violet)" />
          </div>
          <div style={{ padding: "20px 28px", borderRight: "1px solid var(--cal-gray-200)" }}>
            <Stat label="Brand limit" value={`${plan.brandQuota}`} accent="#C97A3F" />
          </div>
          <div style={{ padding: "20px 28px", borderRight: "1px solid var(--cal-gray-200)" }}>
            <Stat
              label="Seats"
              value={plan.seatQuota === 999 ? "∞" : `${plan.seatQuota}`}
              accent="#1F7A5A"
            />
          </div>
          <div style={{ padding: "20px 28px" }}>
            <Stat label="Monthly grant" value={plan.monthlyCreditGrant.toLocaleString()} />
          </div>
        </div>
      </div>

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--cal-gray-200)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="t-eyebrow">Members</div>
          <span className="t-small">{members.length} active</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--cal-gray-50)" }}>
              {["Email", "Role", "Accepted"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "10px 24px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--fg-3)",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                style={{ borderTop: "1px solid var(--cal-gray-200)" }}
              >
                <td style={{ padding: "12px 24px" }}>{member.email}</td>
                <td style={{ padding: "12px 24px" }}>
                  <span className="pill">{member.role}</span>
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
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  style={{ padding: 32, color: "var(--fg-3)", textAlign: "center" }}
                >
                  No members yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
