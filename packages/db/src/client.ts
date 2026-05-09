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

// Audit fix #2: this Map is the singleton pool registry. Keys are
// `<role>@<url>`, so every `createDb(url, "app_admin")` call across the
// process returns the same Drizzle instance backed by the same `postgres`
// pool. Callers can stay pattern-shy (`createDb(...)` inline in queries
// is fine) without leaking connections.
//
// If you see 50+ createDb call sites in grep, that's expected — they all
// resolve to the same 1-2 pools (one per role). Don't refactor them into
// constructor injection unless you're also changing the cache strategy.
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

/**
 * Test-only: drop all pooled connections. Don't call from app code.
 */
export function __resetDbCacheForTests() {
  dbCache.clear();
}

export { schema };
