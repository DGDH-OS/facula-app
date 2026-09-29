import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ButtonLink } from "@/components/ui/Button";
import { SchoolAanvraagFormulier } from "@/components/school/SchoolAanvraagFormulier";

export const metadata: Metadata = {
  title: "Facula voor scholen: lessen en toetsen voor een hele sectie",
  description:
    "Een schoollicentie voor Facula: docentplekken per sectie, een centrale huisstijl, data in de EU en geen leerlingaccounts. Vraag een pilot van zes weken aan.",
};

/**
 * De pagina voor scholen, met het aanvraagformulier.
 *
 * Bewust een eigen pagina en geen blok op de homepage. Een docent die zelf
 * betaalt en een teamleider die inkoopt lezen andere dingen: de een wil weten
 * of het zijn woensdagmiddag scheelt, de ander of het door de privacytoets
 * komt. Beide verhalen op één pagina levert een pagina op waar niemand zich in
 * herkent.
 *
 * Wat hier NIET staat: een prijs per docent. Die staat nog niet vast, en een
 * getal dat later verandert kost meer vertrouwen dan het oplevert. "Prijs op
 * aanvraag" met een pilot ernaast is eerlijker.
 */

const VOOR_SCHOLEN = [
  {
    titel: "Een plek per docent, geen losse abonnementen",
    tekst:
      "De school krijgt docentplekken en één factuur per jaar. Docenten hoeven niets met een eigen creditcard te regelen, en niemand raakt zijn materiaal kwijt als hij van sectie wisselt.",
  },
  {
    titel: "Eén huisstijl voor alles wat de deur uit gaat",
    tekst:
      "De beheerder zet de kleuren, het lettertype en het schoollogo één keer goed. Elke les, toets en brief van elke docent ziet er daarna uit als van jullie school.",
  },
  {
    titel: "Samen in de sectie, niet ieder apart",
    tekst:
      "Een docent kan een les of toets met zijn sectie delen. De sectievoorzitter kan materiaal vrijgeven als sectiestandaard, zodat een invaller of zij-instromer meteen iets bruikbaars heeft.",
  },
  {
    titel: "Zicht op gebruik, niet op docenten",
    tekst:
      "De beheerder ziet hoeveel er per sectie gemaakt wordt. Nooit de inhoud van lessen of teksten, en het is geen beoordelingsinstrument.",
  },
];

const PRIVACY = [
  {
    titel: "Geen leerlingaccounts",
    tekst:
      "Leerlingen loggen niet in en hebben geen account. Facula werkt met wat de docent zelf invoert.",
  },
  {
    titel: "Data in de EU",
    tekst:
      "Database en hosting staan in de EU, en het taalmodel draait op een EU-regio. Er wordt niet getraind op wat jullie invoeren.",
  },
  {
    titel: "Verwerkersovereenkomst",
    tekst:
      "Een model-verwerkersovereenkomst met subverwerkers en bewaartermijnen is beschikbaar voor jullie ICT- of privacyfunctionaris.",
  },
  {
    titel: "AI zichtbaar gemaakt",
    tekst:
      "Elke gegenereerde les, toets en tekst draagt in beeld en in het bestand de vermelding dat hij met AI is gemaakt en door de docent nagekeken moet worden.",
  },
];

const STAPPEN = [
  {
    nummer: "01",
    titel: "Kennismaken",
    tekst:
      "Een gesprek van een half uur met de sectie of de teamleider. Wij laten zien hoe een les uit een leerdoel rolt, jullie vertellen hoe jullie nu werken.",
  },
  {
    nummer: "02",
    titel: "Pilot van zes weken",
    tekst:
      "Eén sectie werkt ermee, met een eigen schoolomgeving en de huisstijl al goed gezet. Geen factuur, geen verplichting.",
  },
  {
    nummer: "03",
    titel: "Beslissen",
    tekst:
      "Na de pilot een voorstel met een prijs per docentplek en een jaarfactuur. Verlengen is een keuze, niet de standaard.",
  },
];

export default function ScholenPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <p className="font-display text-base uppercase tracking-[0.3em] text-tekst-zacht">
              Voor docenten en scholen
            </p>
            <h1 className="mt-6 max-w-[34ch] font-display text-4xl text-marine sm:text-5xl">
              Het door de school geregelde alternatief voor los AI-gebruik
            </h1>
            <p className="mt-6 max-w-[62ch] text-lg text-tekst">
              Docenten gebruiken AI al, of ze het aan de ICT-afdeling vragen of
              niet. Met een schoollicentie gebeurt dat op één plek: met jullie
              huisstijl, data in de EU, een verwerkersovereenkomst, en zonder dat
              er ooit een leerlingaccount nodig is.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <ButtonLink href="#aanvragen" variant="primary">
                Schoollicentie aanvragen
              </ButtonLink>
              <ButtonLink href="/signup" variant="secondary">
                Eerst zelf gratis proberen
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="border-t-2 border-lijn bg-ivoor-deep px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl text-marine">
              Wat een school erbij krijgt
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {VOOR_SCHOLEN.map((punt) => (
                <div
                  key={punt.titel}
                  className="rounded-2xl border-2 border-lijn bg-ivoor p-6"
                >
                  <h3 className="font-display text-xl text-marine">{punt.titel}</h3>
                  <p className="mt-2 max-w-[62ch] text-base text-tekst">{punt.tekst}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="border-t-2 border-lijn px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-[62ch]">
              <h2 className="font-display text-3xl text-marine">
                Wat jullie ICT-afdeling wil weten
              </h2>
              <p className="mt-3 text-base text-tekst-zacht">
                De vier vragen die bij elke schoolinkoop als eerste langskomen.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {PRIVACY.map((punt) => (
                <div key={punt.titel}>
                  <h3 className="font-display text-xl text-marine">{punt.titel}</h3>
                  <p className="mt-2 max-w-[62ch] text-base text-tekst">{punt.tekst}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t-2 border-lijn bg-ivoor-deep px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl text-marine">Hoe een pilot loopt</h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {STAPPEN.map((stap) => (
                <div key={stap.nummer}>
                  <div className="font-display text-4xl text-marine" aria-hidden>
                    {stap.nummer}
                  </div>
                  <h3 className="mt-4 font-display text-xl text-marine">
                    {stap.titel}
                  </h3>
                  <p className="mt-2 max-w-[62ch] text-base text-tekst">{stap.tekst}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="aanvragen" className="border-t-2 border-lijn px-6 py-24">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-3xl text-marine">
              Schoollicentie aanvragen
            </h2>
            <p className="mt-3 max-w-[62ch] text-base text-tekst">
              Laat hieronder achter wie je bent. We nemen binnen twee werkdagen
              contact op met een voorstel voor een pilot. Prijs voor een
              schoollicentie is op aanvraag, afhankelijk van het aantal
              docentplekken.
            </p>
            <div className="mt-10">
              <SchoolAanvraagFormulier />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
