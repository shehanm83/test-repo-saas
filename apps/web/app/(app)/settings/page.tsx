import { listWorkspaceMembers, getSessionWorkspace } from "@/lib/auth/server";

export default async function SettingsPage() {
  const { session, workspace } = await getSessionWorkspace();
  const members = workspace ? await listWorkspaceMembers(workspace.id) : [];

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>Settings & members</h1>
          <p>Workspace profile, plan status, and current member access.</p>
        </div>
      </div>

      <div className="studio-two-column">
        <section className="studio-card studio-copy-card">
          <h2>Workspace</h2>
          <p>
            <strong>Name:</strong> {workspace?.name ?? "No active workspace"}
          </p>
          <p>
            <strong>Plan:</strong> {workspace?.planCode ?? "free"}
          </p>
          <p>
            <strong>Status:</strong> {workspace?.status ?? "active"}
          </p>
          <p>
            <strong>Signed in as:</strong> {session.email}
          </p>
        </section>

        <section className="studio-card">
          <div className="studio-card-head">
            <h2>Members</h2>
            <span>{members.length} active</span>
          </div>
          <div className="studio-table-wrap">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Accepted</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.email}</td>
                    <td>{member.role}</td>
                    <td>{member.acceptedAt ? "Yes" : "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

