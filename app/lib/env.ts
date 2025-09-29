import { z } from "zod";

const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().min(1),
  NUXT_OAUTH_GOOGLE_CLIENT_ID: z.string().min(1),
  NUXT_OAUTH_GOOGLE_CLIENT_SECRET: z.string().min(1),
  NUXT_SESSION_PASSWORD: z.string().min(1),
});

export const env = envSchema.parse(process.env);
