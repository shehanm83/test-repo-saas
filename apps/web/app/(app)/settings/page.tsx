import { I } from "@/components/icons";
import { listWorkspaceMembers, getSessionWorkspace } from "@/lib/auth/server";

export default async function SettingsPage() {
  const { session, workspace } = await getSessionWorkspace();
  const members = workspace ? await listWorkspaceMembers(workspace.id) : [];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Settings &amp; members</h1>
          <p className="page__sub">
            Workspace profile, plan status, and current member access.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section className="card" style={{ padding: 24 }}>
          <div className="t-eyebrow" style={{ marginBottom: 16 }}>
            Workspace
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div className="t-small">Name</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                {workspace?.name ?? "No active workspace"}
              </div>
            </div>
            <div>
              <div className="t-small">Plan</div>
              <div>
                <span className="pill pill--accent">
                  <I.Crown size={11} />
                  {(workspace?.planCode ?? "free").toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <div className="t-small">Status</div>
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
            <div>
              <div className="t-small">Signed in as</div>
              <div style={{ fontSize: 14 }}>{session.email}</div>
            </div>
          </div>
        </section>

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
                  <td style={{ padding: "10px 24px" }}>{member.email}</td>
                  <td style={{ padding: "10px 24px" }}>
                    <span className="pill">{member.role}</span>
                  </td>
                  <td style={{ padding: "10px 24px" }}>
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
                    style={{ padding: 24, color: "var(--fg-3)", textAlign: "center" }}
                  >
                    No members yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
