import Stripe from "stripe";

/**
 * Fase B — Stripe-integratie, klaar maar nog niet live.
 *
 * Er is nog GEEN echt Stripe-account (Ruben moet dit later handmatig
 * aanmaken — bekende Stripe-beperking, kan niet via API). Zodra dat account
 * er is, moeten de volgende environment variables worden toegevoegd — NERGENS
 * anders, geen code-wijziging nodig:
 *
 *   STRIPE_SECRET_KEY        — sk_live_... (of sk_test_... voor een testfase)
 *   STRIPE_PUBLISHABLE_KEY   — pk_live_... (client-side, indien later een
 *                               Stripe.js-embed nodig is; nu niet gebruikt
 *                               omdat we Stripe Checkout (hosted) gebruiken)
 *   STRIPE_WEBHOOK_SECRET    — whsec_... (van het webhook-endpoint in het
 *                               Stripe-dashboard, zie /api/stripe/webhook)
 *   STRIPE_PRICE_ID          — price_... van het maandelijkse abonnement
 *
 * Waar toevoegen (zelfde patroon als de bestaande Supabase-secrets):
 *   1. Infisical — project "dgdh-clients", config "prd-facula"
 *   2. Vercel — project facula-app, Production environment variables
 *
 * Na het invullen van deze vier env vars werkt de hele Stripe-flow direct:
 * /api/stripe/checkout maakt een Checkout Session aan, /api/stripe/webhook
 * verwerkt de betaalbevestiging en zet facula.profiles.subscription_status
 * op 'active'. Geen herbouw nodig.
 */

let cachedClient: Stripe | null = null;

/** True zodra alle vereiste Stripe-env-vars gezet zijn. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Lazy-initialized Stripe-client. Faalt NIET bij module-load (dus de app
 * crasht niet bij opstarten zolang STRIPE_SECRET_KEY ontbreekt) — pas op
 * het moment dat een route deze functie daadwerkelijk aanroept, krijg je
 * een duidelijke fout. Routes die Stripe gebruiken vangen dit af en geven
 * een nette 503 terug (zie /api/stripe/checkout en /api/stripe/webhook).
 */
export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is nog niet geconfigureerd.");
  }
  if (!cachedClient) {
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    });
  }
  return cachedClient;
}

/**
 * Vaste, geconfigureerde basis-URL voor Stripe-redirects (success/cancel)
 * en voor het genereren van webhook-gerelateerde links. NOOIT afgeleid van
 * request.headers.get("host") of vergelijkbaar — dat is een bekende DGDH-
 * regel tegen host-header-injectie bij betaal-/redirect-flows. Env var met
 * fallback naar de bekende productie-URL.
 */
export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://facula-app.vercel.app";
}
