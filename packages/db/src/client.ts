import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type DatabaseRole = "app_user" | "app_admin";
export type Db = ReturnType<typeof drizzle<typeof schema>>;
export type TransactionDb = Parameters<Parameters<Db["transaction"]>[0]>[0];

function withRoleUrl(databaseUrl: string, role: DatabaseRole): string {
  const url = new URL(databaseUrl);
  url.username = role;
  if (!url.password) {
    url.password = "dev";
  }
  return url.toString();
}

const dbCache = new Map<string, Db>();

export function createDb(databaseUrl: string, role: DatabaseRole = "app_user"): Db {
  const cacheKey = `${role}@${databaseUrl}`;
  const cached = dbCache.get(cacheKey);
  if (cached) return cached;

  const sql = postgres(withRoleUrl(databaseUrl, role), {
    max: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    onnotice: () => undefined,
    transform: { undefined: null },
    connection: { application_name: `studio-${role}` },
  });

  const db = drizzle(sql, { schema });
  dbCache.set(cacheKey, db);
  return db;
}

export { schema };
