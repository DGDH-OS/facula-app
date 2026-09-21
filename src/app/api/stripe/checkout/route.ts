import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient, isStripeConfigured, getAppBaseUrl } from "@/lib/stripe";

/**
 * POST /api/stripe/checkout
 * Maakt een Stripe Checkout Session (subscription-mode) aan voor de
 * ingelogde gebruiker. Zolang er geen echt Stripe-account is (env vars
 * ontbreken) geeft deze route een nette 503 terug in plaats van te
 * crashen — zodat een per-ongeluk-klik op de upgrade-knop de rest van de
 * app niet breekt.
 */
export async function POST() {
  if (!isStripeConfigured() || !process.env.STRIPE_PRICE_ID) {
    return NextResponse.json(
      { error: "Betalen is nog niet beschikbaar." },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const stripe = getStripeClient();
    const baseUrl = getAppBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      success_url: `${baseUrl}/app?upgrade=success`,
      cancel_url: `${baseUrl}/app?upgrade=cancelled`,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
    });

    if (!session.url) {
      throw new Error("Stripe gaf geen checkout-URL terug.");
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout-sessie aanmaken mislukt", err);
    return NextResponse.json(
      { error: "Kon geen betaalpagina aanmaken. Probeer het later opnieuw." },
      { status: 500 }
    );
  }
}
