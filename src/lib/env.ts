import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // API Keys
  API_KEY: z.string().optional(),
  EXTERNAL_API_URL: z.string().url().optional(),

  // Feature Flags
  ENABLE_ANALYTICS: z
    .preprocess((val) => String(val ?? "false"), z.string())
    .transform((val) => val === "true")
    .default(false),
  ENABLE_DEBUG: z
    .preprocess((val) => String(val ?? "false"), z.string())
    .transform((val) => val === "true")
    .default(false),

  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Environment variables with type safety
 * @example
 * const { DATABASE_URL, NEXTAUTH_SECRET } = env;
 */
export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
