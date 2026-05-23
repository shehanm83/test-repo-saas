import { createDb } from "@layertone/db";
import { bootstrapNewUser, softDeleteWorkspaceForUser } from "@layertone/db/queries/identity";
import { Webhook } from "svix";

interface ClerkWebhookConfig {
  auth:
    | { mode: "dev"; devUserId: string }
    | {
        mode: "clerk";
        publishableKey: string;
        secretKey: string;
        webhookSecret: string;
      };
  db: { url: string };
}

export interface ClerkWebhookEvent {
  id: string;
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
  };
}

export class ClerkWebhookHandler {
  constructor(private readonly config: ClerkWebhookConfig) {}

  async handle(rawBody: string, headers: Headers): Promise<{ status: number; body: unknown }> {
    if (this.config.auth.mode !== "clerk") {
      return { status: 200, body: { skipped: "dev-mode" } };
    }

    let event: ClerkWebhookEvent;

    try {
      const webhook = new Webhook(this.config.auth.webhookSecret);
      event = webhook.verify(rawBody, {
        "svix-id": headers.get("svix-id") ?? "",
        "svix-timestamp": headers.get("svix-timestamp") ?? "",
        "svix-signature": headers.get("svix-signature") ?? "",
      }) as ClerkWebhookEvent;
    } catch {
      return { status: 400, body: { error: "invalid-signature" } };
    }

    const db = createDb(this.config.db.url, "app_admin");

    if (event.type === "user.created") {
      const email = event.data.email_addresses?.[0]?.email_address;
      if (!email) {
        return { status: 400, body: { error: "missing-email" } };
      }

      return {
        status: 200,
        body: await bootstrapNewUser(db, {
          clerkUserId: event.data.id,
          email,
          eventId: event.id,
        }),
      };
    }

    if (event.type === "user.deleted") {
      await softDeleteWorkspaceForUser(db, event.data.id);
      return { status: 200, body: { ok: true } };
    }

    return { status: 200, body: { ignored: event.type } };
  }
}
