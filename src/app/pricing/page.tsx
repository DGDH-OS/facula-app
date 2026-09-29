import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PrijsKaart, TIERS } from "@/components/PrijsKaart";
import { ButtonLink } from "@/components/ui/Button";

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
            <p className="mt-3 text-base text-tekst">
              Voor een losse docent: maandelijks opzegbaar, bij jaarbetaling twee
              maanden gratis, geen creditcard nodig om te starten. Voor een
              school: een plek per docent met een staffel, en een prijs die bij
              het aantal plekken past.
            </p>
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <PrijsKaart key={tier.naam} tier={tier} kopNiveau="h2" />
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-2xl border-2 border-lijn bg-ivoor-deep p-8">
            <h2 className="font-display text-xl text-marine">
              Betaalt jouw school het uit het professionaliseringsbudget?
            </h2>
            <p className="mt-3 text-base text-tekst">
              Een docent mag dat budget zelf besteden, vaak zonder goedkeuring
              van de schoolleiding. Starter en Actief passen daarbinnen. Zodra
              meerdere docenten op één school meedoen, is een schoollicentie
              goedkoper en regelt de school de facturatie en de privacy in één
              keer.
            </p>
            <div className="mt-6">
              <ButtonLink href="/scholen" variant="secondary">
                Lees meer over een schoollicentie
              </ButtonLink>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
