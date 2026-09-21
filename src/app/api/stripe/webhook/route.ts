import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * POST /api/stripe/webhook
 * Verwerkt Stripe-webhook-events. Signature-verificatie via
 * STRIPE_WEBHOOK_SECRET voorkomt dat iemand anders dan Stripe zelf een
 * gebruiker op "betaald" kan zetten. Zolang Stripe niet geconfigureerd is
 * (env vars ontbreken) geeft deze route een nette 503 terug — Stripe kan
 * dan nog geen events sturen, dus dat is functioneel correct, en het
 * voorkomt een crash als het endpoint per ongeluk toch wordt aangeroepen.
 *
 * Gebruikt de service-role-client (niet de sessie-client): dit endpoint
 * heeft geen ingelogde gebruiker — Stripe roept het rechtstreeks aan — en
 * de gebruiker die bijgewerkt moet worden komt uit de webhook-payload
 * (metadata.supabase_user_id), nooit uit request-headers.
 */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Betalen is nog niet beschikbaar." },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Ontbrekende signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature-verificatie mislukt", err);
    return NextResponse.json({ error: "Ongeldige signature." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id ?? session.client_reference_id;
        if (!userId) {
          console.error("checkout.session.completed zonder supabase_user_id", session.id);
          break;
        }
        const { error } = await supabase
          .schema("facula")
          .from("profiles")
          .update({
            subscription_status: "active",
            stripe_customer_id:
              typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id ?? null,
          })
          .eq("id", userId);
        if (error) throw error;
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) {
          // Fallback: zoek op stripe_subscription_id als metadata ontbreekt.
          const { error } = await supabase
            .schema("facula")
            .from("profiles")
            .update({ subscription_status: "canceled" })
            .eq("stripe_subscription_id", subscription.id);
          if (error) throw error;
          break;
        }
        const { error } = await supabase
          .schema("facula")
          .from("profiles")
          .update({ subscription_status: "canceled" })
          .eq("id", userId);
        if (error) throw error;
        break;
      }

      default:
        // Overige events negeren we bewust — alleen deze twee zijn nodig
        // voor de quota-bypass-logica in deel A.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook-verwerking mislukt", err);
    return NextResponse.json({ error: "Verwerking mislukt." }, { status: 500 });
  }
}
