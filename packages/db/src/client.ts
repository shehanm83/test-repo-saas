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

export function createDb(databaseUrl: string, role: DatabaseRole = "app_user"): Db {
  const sql = postgres(withRoleUrl(databaseUrl, role), {
    onnotice: () => undefined,
    transform: { undefined: null },
    connection: { application_name: `studio-${role}` },
  });

  return drizzle(sql, { schema });
}

export { schema };
