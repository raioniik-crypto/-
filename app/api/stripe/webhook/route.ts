import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceSupabase } from "@/lib/supabase/server";
import { addCredits } from "@/lib/credits";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || "0");

    if (!userId || credits <= 0) {
      console.error("[Webhook] Invalid metadata:", session.metadata);
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabase();

    // --- Idempotency check ---
    // Fetch current order state to avoid double-crediting on webhook retries
    const { data: existingOrder, error: fetchError } = await serviceSupabase
      .from("payment_orders")
      .select("status")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (fetchError) {
      console.error("[Webhook] Failed to fetch order:", fetchError);
      return NextResponse.json({ error: "Order lookup failed" }, { status: 500 });
    }

    if (existingOrder?.status === "completed") {
      console.log(`[Webhook] Session ${session.id} already completed, skipping.`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // --- Atomic transition: pending -> completed ---
    // Only succeeds if status is still pending (prevents race conditions with concurrent webhooks)
    const { data: updated, error: updateError } = await serviceSupabase
      .from("payment_orders")
      .update({ status: "completed" })
      .eq("stripe_session_id", session.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[Webhook] Failed to update order status:", updateError);
      return NextResponse.json({ error: "Order update failed" }, { status: 500 });
    }

    if (!updated) {
      // Another webhook invocation already transitioned this order
      console.log(`[Webhook] Session ${session.id} race condition, skipping credit add.`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // --- Credit add (safe: only reached once per session) ---
    const result = await addCredits(userId, credits, "purchase", session.id);
    if (!result.success) {
      console.error(`[Webhook] Credit add failed for session ${session.id}`);
      // Revert order status to allow retry
      await serviceSupabase
        .from("payment_orders")
        .update({ status: "pending" })
        .eq("stripe_session_id", session.id);
      return NextResponse.json({ error: "Credit add failed" }, { status: 500 });
    }

    console.log(`[Webhook] Added ${credits} credits to user ${userId} (session ${session.id})`);
  }

  return NextResponse.json({ received: true });
}
