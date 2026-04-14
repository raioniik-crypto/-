import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { CREDIT_PLANS } from "@/lib/billing";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { planId } = await request.json();
    const plan = CREDIT_PLANS.find((p) => p.id === planId);

    if (!plan) {
      return NextResponse.json({ error: "無効なプランです" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `SNS Content Generator - ${plan.label}`,
              description: `${plan.credits}クレジット`,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        credits: plan.credits.toString(),
      },
      success_url: `${origin}?payment=success`,
      cancel_url: `${origin}?payment=cancelled`,
    });

    // Record pending order
    const serviceSupabase = createServiceSupabase();
    await serviceSupabase.from("payment_orders").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      credits: plan.credits,
      amount: plan.price,
      status: "pending",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
