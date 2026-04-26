import type { BillingProvider } from "@studio/shared";

export class RefundService {
  constructor(private readonly billing: BillingProvider) {}

  async refund(chargeId: string, reason?: string): Promise<void> {
    await this.billing.refundCharge({ chargeId, ...(reason ? { reason } : {}) });
  }
}
