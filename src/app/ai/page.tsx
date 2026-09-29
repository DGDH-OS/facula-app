import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "AI in Facula",
  description:
    "Wat Facula met taalmodellen doet, wat de Assistent niet doet, en waar jij verantwoordelijk blijft.",
};

export default function AiPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-base font-semibold uppercase tracking-wide text-tekst-zacht">
            Versie 29 september 2026
          </p>
          <h1 className="mt-2 font-display text-4xl text-marine">AI in Facula</h1>
          <p className="mt-4 text-base text-tekst-zacht">
            Korte, conservatieve uitleg. Geen claims over training of
            vestigingsland die we hier niet kunnen bewijzen.
          </p>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="font-display text-xl text-marine">1. Wat is AI hier?</h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Facula is een hulpmiddel voor docenten. Bij les- en
                toetsgeneratie kan een taalmodel conceptmateriaal maken op
                basis van jouw leerdoel. Dat is een voorstel, geen besluit.
                Jij leest na en jij blijft verantwoordelijk voor wat de klas
                ziet.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">2. De Assistent is geen chatbot</h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                De Facula Assistent herkent welke bestaande module je bedoelt
                (les, toets, rapport, oudercontact, coach, nakijken,
                toetsweek) en maakt een checklist. Hij gebruikt geen
                taalmodel, verzint geen ontbrekende velden en beoordeelt geen
                leerlingen. Onbekende verzoeken weigert hij.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">3. Geen leerling-AI</h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Leerlingen loggen niet in. Facula maakt geen leerlingversie,
                geen oefenapp en geen chat voor leerlingen. Materiaal dat jij
                genereert, exporteer je zelf.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">4. Persoonsgegevens</h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Typ geen namen, e-mailadressen, telefoonnummers, cijfers of
                diagnoses in de Assistent of de coach. In de rapport-module
                gebruik je alleen initialen. Details staan in de{" "}
                <Link href="/privacy" className="font-semibold text-marine underline underline-offset-4">
                  privacyverklaring
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">5. Menselijke controle</h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Facula geeft geen cijfers, geen overgangsadvies en geen
                diagnose. Gegenereerde teksten zijn concepten. Zonder jouw
                controle mogen ze niet de klas of de ouder in.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
