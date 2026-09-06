import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./packages/db/src/schema/index.ts",
  out: "./packages/db/src/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://layertone:dev@localhost:5432/layertone",
  },
  strict: true,
  verbose: true,
});
