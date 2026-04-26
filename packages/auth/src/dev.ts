interface AuthIdentity {
  userId: string;
  workspaceId: string | null;
  role: "user" | "admin";
}

interface AuthProvider {
  verifyRequest(headers: Headers): Promise<AuthIdentity | null>;
  setActiveWorkspace(userId: string, workspaceId: string): Promise<void>;
}

export class DevAuthProvider implements AuthProvider {
  constructor(private readonly devUserId: string) {}

  async verifyRequest(headers: Headers): Promise<AuthIdentity | null> {
    const overrideUser = headers.get("x-dev-user-id") ?? this.devUserId;
    const workspaceId = headers.get("x-dev-workspace-id") ?? null;
    const role = headers.get("x-dev-role") === "admin" ? "admin" : "user";

    return { userId: overrideUser, workspaceId, role };
  }

  async setActiveWorkspace(_userId: string, _workspaceId: string): Promise<void> {
    return;
  }
}
