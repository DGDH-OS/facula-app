import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function VoorwaardenPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-base font-semibold uppercase tracking-wide text-tekst-zacht">
            Versie 27 september 2026
          </p>
          <h1 className="mt-2 font-display text-4xl text-marine">
            Algemene voorwaarden
          </h1>
          <p className="mt-4 text-base text-tekst-zacht">
            Dit is een concept. Bij vragen over deze voorwaarden neem contact
            op via{" "}
            <a
              href="mailto:info@dgdh-os.com"
              className="font-semibold text-marine underline underline-offset-4"
            >
              info@dgdh-os.com
            </a>
            .
          </p>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="font-display text-xl text-marine">
                1. De dienst
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Facula is een webapp waarmee docenten lesmateriaal, toetsen en
                rapportteksten genereren op basis van zelf ingevoerde
                leerdoelen en gegevens. Facula is een hulpmiddel, geen
                vervanging van jouw eigen vakkennis en beoordeling.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                2. Je account
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Je bent zelf verantwoordelijk voor het geheimhouden van je
                inloggegevens en voor alle activiteit onder je account. Merk
                je onbevoegd gebruik van je account? Meld dit direct.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                3. Gebruik van de dienst
              </h2>
              <ul className="mt-2 space-y-2 text-base leading-relaxed text-tekst">
                <li>
                  • Je controleert gegenereerde lessen, toetsen en teksten
                  zelf op inhoudelijke juistheid voordat je ze in de klas
                  gebruikt.
                </li>
                <li>
                  • Voer geen leerlinggegevens in behalve in de
                  rapport-module, en gebruik daar bij voorkeur initialen in
                  plaats van volledige namen.
                </li>
                <li>
                  • De Facula Assistent is een hulpmiddel om een bestaande
                  module te kiezen met vaste opties. Je kunt daar geen
                  namen, e-mailadressen of leerlingteksten invullen. Hij
                  beoordeelt niet en geeft geen cijfers. Jij blijft
                  eindverantwoordelijk voor wat je in de klas of naar
                  ouders stuurt.
                </li>
                <li>
                  • Gebruik Facula niet voor onwettige doeleinden of om
                  schade aan derden of aan Facula toe te brengen.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                4. Intellectueel eigendom
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Jij behoudt de rechten op wat je zelf invoert (je leerdoelen,
                aantekeningen en aanpassingen). De lessen, toetsen en teksten
                die Facula voor jou genereert, mag je vrij gebruiken in je
                onderwijspraktijk.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                5. Beschikbaarheid
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                We doen ons best om Facula beschikbaar en betrouwbaar te
                houden, maar kunnen geen ononderbroken beschikbaarheid
                garanderen. Onderhoud of storingen kunnen de dienst
                tijdelijk beïnvloeden.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                6. Aansprakelijkheid
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Facula is een hulpmiddel bij het maken van lesmateriaal. Wij
                zijn niet aansprakelijk voor schade die voortvloeit uit het
                ongecontroleerd gebruik van gegenereerde inhoud in de klas.
                Onze aansprakelijkheid is, voor zover wettelijk toegestaan,
                beperkt tot het bedrag dat je in de voorgaande twaalf maanden
                aan ons hebt betaald.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                7. Opzeggen en account verwijderen
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Je kunt je account op elk moment zelf verwijderen via je{" "}
                <Link
                  href="/app/account"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  accountpagina
                </Link>
                . Daarmee stopt een eventueel abonnement en worden je
                gegevens verwijderd, zoals beschreven in onze{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  privacyverklaring
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                8. Toepasselijk recht
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Op deze voorwaarden is Nederlands recht van toepassing.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
