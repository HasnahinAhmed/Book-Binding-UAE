import { db } from "@/db";
import { stripeClient } from "@/lib/payments/stripe-client";
import { handleStripeEvent } from "@/lib/payments/stripe-flow";
import { serverEnv } from "@/lib/server/env";
import { BodyTooLargeError, jsonError, readBodyLimited } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stripe → server. Only signature-verified events are processed. */
export async function POST(req: Request): Promise<Response> {
  const stripe = stripeClient();
  if (!stripe || !serverEnv.stripeWebhookSecret) return jsonError(503, "payments_disabled");
  const signature = req.headers.get("stripe-signature");
  if (!signature) return jsonError(400, "missing_signature");

  let payload: string;
  try {
    payload = new TextDecoder().decode(await readBodyLimited(req, 1024 * 1024));
  } catch (e) {
    return jsonError(e instanceof BodyTooLargeError ? 413 : 400, "bad_body");
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, serverEnv.stripeWebhookSecret);
  } catch {
    return jsonError(400, "invalid_signature");
  }

  const outcome = await handleStripeEvent(db, event);
  return Response.json({ received: true, outcome });
}
