import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { site } from "@/config/site";
import { db, schema } from "@/db";
import { serverEnv } from "@/lib/server/env";

if (!serverEnv.authSecret && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("BETTER_AUTH_SECRET must be set (32+ characters)");
}

export const auth = betterAuth({
  appName: site.name,
  baseURL: site.url,
  secret: serverEnv.authSecret,
  trustedOrigins: [site.url],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
    // No email provider is configured yet, so addresses cannot be verified
    // and password-reset emails cannot be sent. See docs/IMPLEMENTATION_PLAN.md.
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    additionalFields: {
      // set only by staff tooling, never from sign-up input
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 300, max: 8 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/change-password": { window: 300, max: 5 },
    },
  },
  advanced: {
    ipAddress: serverEnv.trustProxy ? { ipAddressHeaders: ["x-forwarded-for"] } : { ipAddressHeaders: ["x-bbu-no-proxy"] },
    useSecureCookies: site.url.startsWith("https://"),
  },
  telemetry: { enabled: false },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type Role = "customer" | "staff" | "admin";

/** The signed-in user for the current request, or null. */
export async function currentSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

export function roleOf(session: Session | null): Role | null {
  const r = (session?.user as { role?: string } | undefined)?.role;
  return r === "admin" || r === "staff" || r === "customer" ? r : null;
}
