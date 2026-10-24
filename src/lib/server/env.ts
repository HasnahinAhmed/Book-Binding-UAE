import "server-only";
import path from "node:path";
import { z } from "zod";

// Server-only settings. Never import this from a client component.
const schema = z.object({
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().min(1).default("./storage/private"),
  UPLOAD_MAX_MB: z.coerce.number().int().min(1).max(200).default(50),
  /** Set to "1" only behind a proxy that overwrites X-Forwarded-For (e.g. Vercel). */
  TRUST_PROXY: z.enum(["0", "1"]).default("0"),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//).optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
});

const env = schema.parse({
  STORAGE_DRIVER: process.env.STORAGE_DRIVER || undefined,
  STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR || undefined,
  UPLOAD_MAX_MB: process.env.UPLOAD_MAX_MB || undefined,
  TRUST_PROXY: process.env.TRUST_PROXY || undefined,
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || undefined,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
});

export const serverEnv = {
  storageDriver: env.STORAGE_DRIVER,
  storageLocalDir: path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.STORAGE_LOCAL_DIR),
  uploadMaxBytes: env.UPLOAD_MAX_MB * 1024 * 1024,
  trustProxy: env.TRUST_PROXY === "1",
  databaseUrl: env.DATABASE_URL,
  authSecret: env.BETTER_AUTH_SECRET,
  stripeSecretKey: env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  /** online card payments are on only when both Stripe keys are set */
  paymentsEnabled: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
} as const;
