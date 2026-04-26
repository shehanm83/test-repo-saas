import { ClerkAuthProvider, DevAuthProvider } from "@studio/auth";
import { StripeBillingProvider } from "@studio/billing";
import { S3StorageAdapter } from "@studio/storage";

import type { Config } from "../config";

import type {
  AIProvider,
  AuthProvider,
  BillingProvider,
  EmailProvider,
  QueueAdapter,
  StorageAdapter,
  Telemetry,
} from "./types";

export interface Adapters {
  auth: AuthProvider;
  storage: StorageAdapter;
  queue: QueueAdapter;
  billing: BillingProvider;
  ai: AIProvider;
  email: EmailProvider;
  telemetry: Telemetry;
}

const createUnwiredAdapter = <T>(name: string): T =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(`${name} adapter not wired yet`);
      },
    },
  ) as T;

class StubBillingProvider implements BillingProvider {
  constructor(private readonly appUrl: string) {}

  async ensureCustomer(workspaceId: string): Promise<{ customerId: string }> {
    return { customerId: `stub-${workspaceId}` };
  }

  async createSubscriptionCheckout(): Promise<{ url: string }> {
    return { url: `${this.appUrl}/billing?stub=subscription` };
  }

  async createTopupCheckout(args: { packCode: string }): Promise<{ url: string }> {
    return { url: `${this.appUrl}/billing?stub=topup&pack=${args.packCode}` };
  }

  async customerPortalUrl(args: { returnUrl: string }): Promise<{ url: string }> {
    return { url: args.returnUrl };
  }

  async verifyWebhook(): Promise<{ id: string; type: string; data: unknown }> {
    return { id: "stub-webhook", type: "stub", data: {} };
  }

  async refundCharge(): Promise<void> {
    return;
  }

  async listPaidInvoices(): Promise<Array<{ invoiceId: string; priceId: string | null }>> {
    return [];
  }
}

export function createAdapters(config: Config): Adapters {
  const auth: AuthProvider =
    config.auth.mode === "clerk"
      ? new ClerkAuthProvider({
          publishableKey: config.auth.publishableKey,
          secretKey: config.auth.secretKey,
        })
      : new DevAuthProvider(config.auth.devUserId);

  const billing: BillingProvider =
    config.billing.mode === "stub"
      ? new StubBillingProvider(config.appUrl)
      : new StripeBillingProvider({
          secretKey: config.billing.stripeSecretKey!,
          webhookSecret: config.billing.webhookSecret!,
          topupPrices: config.billing.topupPrices,
        });

  return {
    auth,
    storage: new S3StorageAdapter({
      region: config.storage.region,
      bucket: config.storage.bucketApp,
      forcePathStyle: config.storage.mode === "minio",
      ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
      ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
      ...(config.storage.secretAccessKey
        ? { secretAccessKey: config.storage.secretAccessKey }
        : {}),
    }),
    queue: createUnwiredAdapter<QueueAdapter>("queue"),
    billing,
    ai: createUnwiredAdapter<AIProvider>("ai"),
    email: createUnwiredAdapter<EmailProvider>("email"),
    telemetry: createUnwiredAdapter<Telemetry>("telemetry"),
  };
}
