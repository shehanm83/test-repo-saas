import type { Adapters, Config } from "@vyora/shared";

import { GenerationApi } from "./generation";

export class GenerationEstimateApi {
  private readonly generationApi: GenerationApi;

  constructor(config: Config, adapters: Adapters) {
    this.generationApi = new GenerationApi(config, adapters);
  }

  async estimate(args: { workspaceId: string; input: unknown }) {
    return this.generationApi.estimate(args);
  }
}
