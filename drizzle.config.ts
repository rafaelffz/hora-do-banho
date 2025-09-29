import { defineConfig } from "drizzle-kit";
import { env } from "./app/lib/env";

export default defineConfig({
  out: "./server/database/migrations",
  schema: "./server/database/schema/index.ts",
  casing: "snake_case",
  dialect: "turso",
  dbCredentials: {
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
});
