import type { BillingProvider } from "@vyora/shared";

export class RefundService {
  constructor(private readonly billing: BillingProvider) {}

  async refund(chargeId: string, reason?: string): Promise<void> {
    await this.billing.refundCharge({ chargeId, ...(reason ? { reason } : {}) });
  }
}
