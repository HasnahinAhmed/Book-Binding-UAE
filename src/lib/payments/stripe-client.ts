import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/server/env";

let client: Stripe | null = null;

/** Created on first use so builds work without keys. Null when payments are off. */
export function stripeClient(): Stripe | null {
  if (!serverEnv.paymentsEnabled) return null;
  client ??= new Stripe(serverEnv.stripeSecretKey!, { maxNetworkRetries: 2, timeout: 20_000 });
  return client;
}
