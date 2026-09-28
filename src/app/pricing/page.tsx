import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PrijsKaart, TIERS } from "@/components/PrijsKaart";

/**
 * De pakketten stonden hier eerder een tweede keer uitgeschreven, naast
 * die op de homepage. Beide komen nu uit `TIERS` en worden door dezelfde
 * `PrijsKaart` getoond, zodat een prijswijziging niet half doorkomt.
 * `kopNiveau="h2"` omdat deze kaarten hier direct onder de h1 hangen.
 */
export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-xl text-center">
            <h1 className="font-display text-4xl text-marine">Prijzen</h1>
            <p className="mt-3 text-base text-tekst-zacht">
              Maandelijks opzegbaar. Bij jaarbetaling twee maanden gratis.
              Geen creditcard nodig om te starten.
            </p>
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <PrijsKaart key={tier.naam} tier={tier} kopNiveau="h2" />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
