import { createClerkClient, verifyToken } from "@clerk/backend";

interface AuthIdentity {
  userId: string;
  workspaceId: string | null;
  role: "user" | "admin";
}

interface AuthProvider {
  verifyRequest(headers: Headers): Promise<AuthIdentity | null>;
  setActiveWorkspace(userId: string, workspaceId: string): Promise<void>;
}

export interface ClerkAuthOptions {
  publishableKey: string;
  secretKey: string;
}

export class ClerkAuthProvider implements AuthProvider {
  private client: ReturnType<typeof createClerkClient>;

  constructor(private readonly options: ClerkAuthOptions) {
    this.client = createClerkClient({
      secretKey: options.secretKey,
      publishableKey: options.publishableKey,
    });
  }

  async verifyRequest(headers: Headers): Promise<AuthIdentity | null> {
    const authHeader = headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return null;
    }

    try {
      const verified = (await verifyToken(token, {
        secretKey: this.options.secretKey,
      })) as {
        sub: string;
        current_workspace_id?: string;
        role?: string;
      };

      return {
        userId: verified.sub,
        workspaceId: verified.current_workspace_id ?? null,
        role: verified.role === "admin" ? "admin" : "user",
      };
    } catch {
      return null;
    }
  }

  async setActiveWorkspace(userId: string, workspaceId: string): Promise<void> {
    await this.client.users.updateUserMetadata(userId, {
      publicMetadata: { current_workspace_id: workspaceId },
    });
  }
}
