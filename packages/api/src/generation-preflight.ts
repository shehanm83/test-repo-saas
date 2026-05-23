import { Ledger } from "@layertone/billing";
import { createDb } from "@layertone/db";
import {
  normalizeCommercialGenerationInput,
  preflightNormalizedCommercialInput,
} from "@layertone/shared";
import type { Adapters, Config } from "@layertone/shared";

import { GenerationApi } from "./generation";

export class GenerationPreflightApi {
  private readonly generationApi: GenerationApi;

  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {
    this.generationApi = new GenerationApi(config, adapters);
  }

  async preflight(args: { workspaceId: string; input: unknown }) {
    const normalized = normalizeCommercialGenerationInput(args.input);
    const result = preflightNormalizedCommercialInput(normalized);
    const estimate = await this.generationApi.estimate({
      workspaceId: args.workspaceId,
      input: args.input,
    });

    const ledger = new Ledger(createDb(this.config.db.url, "app_admin"), this.adapters.telemetry);
    const balance = await ledger.getBalance(args.workspaceId);
    if (estimate.credits > balance) {
      result.blocking.push({
        code: "billing.insufficient_credits",
        message: "You do not have enough credits for this generation.",
        field: "credits",
      });
    }

    return { ...result, estimate: { ...estimate, balance } };
  }
}
