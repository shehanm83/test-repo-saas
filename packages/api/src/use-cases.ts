import {
  createDb,
  createUseCase,
  deleteUseCase,
  getUseCase,
  listUseCases,
  updateUseCase,
} from "@vyora/db";
import type { Config } from "@vyora/shared/config";
import { z } from "zod";

const UseCaseInput = z.object({
  code: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(80),
  platform: z.string().max(40).optional().nullable(),
  targetWidth: z.number().int().positive().max(8192),
  targetHeight: z.number().int().positive().max(8192),
  aspectRatio: z.string().min(1).max(16),
  icon: z.string().max(8).optional().nullable(),
  sortOrder: z.number().int().default(0),
  status: z.enum(["active", "paused", "deprecated"]).default("active"),
});

export class UseCaseApi {
  constructor(private readonly config: Config) {}
  private db() {
    return createDb(this.config.db.url, "app_admin");
  }

  list(opts?: { activeOnly?: boolean }) {
    return listUseCases(this.db(), opts);
  }
  get(code: string) {
    return getUseCase(this.db(), code);
  }
  create(input: unknown) {
    return createUseCase(this.db(), UseCaseInput.parse(input));
  }
  update(code: string, patch: unknown) {
    return updateUseCase(this.db(), code, UseCaseInput.partial().parse(patch) as never);
  }
  delete(code: string) {
    return deleteUseCase(this.db(), code);
  }
}
