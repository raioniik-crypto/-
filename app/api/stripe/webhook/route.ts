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
      console.error("Invalid metadata in webhook:", session.metadata);
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    // Update order status
    const serviceSupabase = createServiceSupabase();
    await serviceSupabase
      .from("payment_orders")
      .update({ status: "completed" })
      .eq("stripe_session_id", session.id);

    // Add credits
    await addCredits(userId, credits, "purchase", session.id);

    console.log(`[Webhook] Added ${credits} credits to user ${userId}`);
  }

  return NextResponse.json({ received: true });
}
