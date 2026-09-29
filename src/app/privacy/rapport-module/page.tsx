import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function RapportModulePrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          {/*
            Was goud-op-goud (2,65:1). Nu het waarschuwing-paar uit
            globals.css: 10,43:1, en het is hetzelfde vlak/tekst-paar als de
            StatusBadge met dezelfde betekenis elders in de app.
          */}
          <span className="inline-block rounded-full bg-waarschuwing-vlak px-3 py-1 text-base font-semibold text-waarschuwing-tekst">
            AVG-gevoelig: bevat mogelijk leerlinggegevens
          </span>
          <h1 className="mt-4 font-display text-4xl text-marine">
            Privacy &amp; de rapport-module
          </h1>
          <p className="mt-4 text-base text-tekst">
            Facula bestaat uit twee delen met een verschillend privacy-profiel.
            De les- en toetsgenerator gebruikt geen leerlingnamen of
            leerlingdata en is AVG-licht. De module &quot;Rapport &amp;
            oudercommunicatie&quot; is anders: daar typ je aantekeningen over
            een specifieke leerling in, en dat kan persoonsgegevens zijn.
            Deze pagina legt eerlijk uit wat dat betekent.
          </p>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="font-display text-xl text-marine">
                Wat deze module wel en niet doet
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Je typt losse aantekeningen of steekwoorden over een leerling
                in, kiest een output-type (rapporttekst, oudergesprek-verslag
                of oudermail) en een toon. Facula herformuleert dat tot een
                vloeiende, professionele tekst. Je kopieert die tekst zelf
                over in Magister, Somtoday of je mail. Er is bewust géén
                automatische koppeling met een schoolsysteem, want die
                koppeling bestaat simpelweg niet als self-service optie bij
                de grote Nederlandse schoolsystemen.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Wat we nooit laten genereren
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                De generator voegt nooit zelf een cijfer, beoordeling,
                kwalificatie-oordeel of een advies over overgaan/zakken toe.
                Dat is geen belofte in tekst alleen: het is een ingebouwde,
                geteste controle in de code: als de gegenereerde tekst
                evaluatieve of cijfermatige taal bevat die jij niet zelf hebt
                ingevoerd, wordt dat gemeld. Jij blijft altijd de auteur en
                beoordelaar van het eindoordeel.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Pseudonimisering wordt aangeraden
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Gebruik bij voorkeur initialen (bijv. &quot;L.J.&quot;) of een
                korte omschrijving in plaats van een volledige naam. Voor een
                goede, vloeiende tekst is een naam niet nodig. Hoe minder
                direct herleidbare persoonsgegevens je invoert, hoe kleiner
                het privacyrisico, en dat geldt voor jou als docent en voor
                Facula als leverancier.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Verwerkersovereenkomst (DPA)
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Zodra deze module structureel wordt gebruikt binnen een
                school en er persoonsgegevens van leerlingen in worden
                verwerkt, is een verwerkersovereenkomst tussen de school en
                Facula verplicht onder de AVG. Dit traject is bij ons nog in
                voorbereiding. Wil je deze module structureel binnen je
                school gebruiken? Neem dan contact met ons op, dan zetten we
                samen de verwerkersovereenkomst op voordat je op grotere
                schaal gaat werken.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Kort samengevat
              </h2>
              <ul className="mt-2 space-y-2 text-base text-tekst">
                <li>• Deze module kan leerlinggegevens verwerken, de les/toetsgenerator niet.</li>
                <li>• Gebruik bij voorkeur initialen in plaats van volledige namen.</li>
                <li>• Geen automatische export naar Magister/Somtoday, jij kopieert zelf.</li>
                <li>• De tekst bevat nooit zelf toegevoegde cijfers of oordelen.</li>
                <li>• Structureel schoolgebruik vraagt een verwerkersovereenkomst. Die is nog in voorbereiding, neem contact op.</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 border-t-2 border-lijn pt-6">
            <Link
              href="/app/reports/new"
              className="inline-flex min-h-14 items-center text-base font-semibold text-marine underline underline-offset-4"
            >
              ← Terug naar Rapport &amp; oudercommunicatie
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
