import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PrijsKaart, TIERS } from "@/components/PrijsKaart";
import { ButtonLink } from "@/components/ui/Button";

const VAKKEN = [
  {
    naam: "Maatschappijleer",
    beschrijving:
      "Van referentiekader tot framing — actuele casussen met echte cijfers.",
  },
  {
    naam: "Geschiedenis",
    beschrijving: "Bronkritiek en causaliteit, verankerd in periodisering.",
  },
  {
    naam: "Economie",
    beschrijving: "Vraag, aanbod en conjunctuur — met actuele marktdata.",
  },
  {
    naam: "Aardrijkskunde",
    beschrijving: "Ruimtelijke vraagstukken, van verstedelijking tot duurzaamheid.",
  },
];

const STAPPEN = [
  {
    nummer: "01",
    titel: "Leerdoel invoeren",
    tekst:
      "Vul vak, niveau, leerjaar, leerdoel en lesduur in — precies zoals je het al in je hoofd hebt.",
  },
  {
    nummer: "02",
    titel: "Genereren",
    tekst:
      "Facula vult het beproefde lesformat: kernbegrippen, casus met cijfers, uitgewerkt voorbeeld, opdracht, bespreking en huiswerk.",
  },
  {
    nummer: "03",
    titel: "Exporteren & lesgeven",
    tekst:
      "Bewerk waar nodig, koppel er direct een toets aan op dezelfde leerdoelen, en exporteer naar PowerPoint of Word.",
  },
];

const FAQS = [
  {
    vraag: "Slaat Facula leerlinggegevens op?",
    antwoord:
      "Nee. Facula werkt in v1 volledig zonder leerlingdata — jij voert alleen leerdoel, vak, niveau en cijfers in die je zelf kiest. Dat houdt de AVG-impact minimaal en vergelijkbaar met elke andere professionele schrijftool.",
  },
  {
    vraag: "Naar welke formaten kan ik exporteren?",
    antwoord:
      "Lessen exporteer je naar PowerPoint of Word, toetsen naar Word of PDF inclusief antwoordsleutel. Je kunt alles ook eerst op het scherm bewerken voordat je exporteert.",
  },
  {
    vraag: "Voor welke vakken werkt Facula?",
    antwoord:
      "We starten met maatschappijleer, geschiedenis, economie en aardrijkskunde voor havo en vwo. Nieuwe vakken en niveaus volgen op basis van vraag van docenten.",
  },
  {
    vraag: "Kan ik het eerst gratis proberen?",
    antwoord:
      "Ja. Je kunt zonder betaalgegevens een account aanmaken en direct een eerste les en toets genereren om te zien of het aansluit bij jouw manier van lesgeven.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-ivoor px-6 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-display text-base uppercase tracking-[0.3em] text-tekst-zacht">
              Facula
            </p>
            <h1 className="mt-6 font-display text-4xl text-marine sm:text-5xl md:text-6xl">
              Lesmateriaal dat past bij jouw kerndoelen,
              <br className="hidden sm:block" /> in minuten.
            </h1>
            <p className="mx-auto mt-6 max-w-[62ch] text-lg text-tekst">
              Facula is de les- en toetssuite voor Nederlandse docenten. Voer je
              leerdoel in, en krijg een complete, herkenbare les en bijpassende
              toets. Geen chatbot, maar een vakinstrument.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <ButtonLink href="/signup" variant="primary">
                Probeer gratis
              </ButtonLink>
              <ButtonLink href="#voorbeeld" variant="secondary">
                Bekijk een voorbeeld
              </ButtonLink>
            </div>
          </div>

          {/*
            Eén rustig visueel moment: een echte dia zoals Facula hem maakt,
            stil op de pagina, één keer zacht omhoog bij het laden. Geen 3D,
            geen video, geen scroll-effect — de dia zelf is het beeld, en hij
            toont meteen de regel uit PRESENTATIE-METHODIEK.md: korte
            assertion als titel, hooguit vier regels eronder.
          */}
          <figure className="rustig-fade mx-auto mt-16 max-w-2xl">
            <div className="rounded-2xl border-2 border-lijn bg-ivoor-deep p-8 sm:p-10">
              <p className="font-display text-base uppercase tracking-[0.2em] text-tekst-zacht">
                Maatschappijleer · havo 4 · les 1
              </p>
              <h2 className="mt-4 max-w-[26ch] font-display text-2xl text-marine sm:text-3xl">
                Je referentiekader stuurt wat je ziet
              </h2>
              <div className="mt-6 h-1 w-20 rounded-full bg-goud" aria-hidden />
              <ul className="mt-6 space-y-3 text-lg text-tekst">
                <li className="flex gap-3">
                  <span aria-hidden>•</span>
                  <span>Waarden en ervaring kleuren je oordeel</span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden>•</span>
                  <span>Selectieve waarneming filtert het nieuws</span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden>•</span>
                  <span>Casus: 68% haalt nieuws via social media</span>
                </li>
              </ul>
            </div>
            <figcaption className="mx-auto mt-4 max-w-[62ch] text-center text-base text-tekst-zacht">
              Een dia zoals Facula hem maakt: korte kop, hooguit vier regels,
              direct klaar voor PowerPoint.
            </figcaption>
          </figure>
        </section>

        {/* Hoe het werkt */}
        <section
          id="hoe-het-werkt"
          className="border-t-2 border-lijn bg-ivoor-deep px-6 py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-[62ch]">
              <h2 className="font-display text-3xl text-marine">Hoe het werkt</h2>
              <p className="mt-3 text-base text-tekst-zacht">
                Drie stappen tussen een leeg vel en een complete les.
              </p>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {STAPPEN.map((stap) => (
                <div key={stap.nummer}>
                  <div
                    className="font-display text-4xl text-marine"
                    aria-hidden
                  >
                    {stap.nummer}
                  </div>
                  <h3 className="mt-4 font-display text-xl text-marine">
                    {stap.titel}
                  </h3>
                  <p className="mt-2 text-base text-tekst-zacht">{stap.tekst}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vakken */}
        <section id="vakken" className="border-t-2 border-lijn px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-[62ch]">
              <h2 className="font-display text-3xl text-marine">
                Vakken die Facula nu al kent
              </h2>
              <p className="mt-3 text-base text-tekst-zacht">
                Gebouwd voor havo en vwo, met NL-kerndoelen als uitgangspunt.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {VAKKEN.map((vak) => (
                <div
                  key={vak.naam}
                  className="rounded-2xl border-2 border-lijn bg-ivoor p-6"
                >
                  <h3 className="font-display text-xl text-marine">{vak.naam}</h3>
                  <p className="mt-2 text-base text-tekst-zacht">
                    {vak.beschrijving}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Voorbeeld-output */}
        <section
          id="voorbeeld"
          className="op-donker border-t-2 border-lijn bg-marine px-6 py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-[62ch]">
              <h2 className="font-display text-3xl">Een voorbeeld</h2>
              <p className="mt-3 text-base text-op-donker-zacht">
                Een fragment uit een echte, door Facula gemaakte les voor havo 4
                maatschappijleer.
              </p>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              <div className="rounded-2xl border-2 border-op-donker-zacht bg-marine-deep p-8">
                <p className="text-base font-semibold uppercase tracking-[0.2em] text-op-donker-zacht">
                  Les 1 · Kernbegrippen
                </p>
                <h3 className="mt-3 font-display text-xl">
                  Referentiekader &amp; selectieve waarneming
                </h3>
                <p className="mt-4 text-base text-op-donker-zacht">
                  <strong className="text-op-donker">Referentiekader:</strong> het
                  geheel van waarden, normen, ervaringen en kennis waarmee iemand
                  de werkelijkheid interpreteert en beoordeelt.
                </p>
                <p className="mt-3 text-base text-op-donker-zacht">
                  <strong className="text-op-donker">Casus:</strong> 68% van de 16-
                  tot 24-jarigen haalt dagelijks nieuws via social media,
                  tegenover 31% via een traditionele bron (CBS, 2024).
                </p>
              </div>
              <div className="rounded-2xl border-2 border-op-donker-zacht bg-marine-deep p-8">
                <p className="text-base font-semibold uppercase tracking-[0.2em] text-op-donker-zacht">
                  Bijpassende toets · Vraag 3
                </p>
                <h3 className="mt-3 font-display text-xl">Meerkeuzevraag</h3>
                <p className="mt-4 text-base text-op-donker-zacht">
                  Welke omschrijving hoort bij het begrip &quot;framing&quot;?
                </p>
                <ul className="mt-3 space-y-2 text-base text-op-donker-zacht">
                  <li>A. Het bewust misleiden met onjuiste feiten.</li>
                  {/*
                    Het juiste antwoord stond eerder alleen in een goud vlak.
                    Kleur alleen mag nooit de betekenis dragen, dus het staat
                    er nu ook in woorden bij.
                  */}
                  <li className="border-l-4 border-goud pl-3 font-semibold text-op-donker">
                    B. De manier waarop een boodschap wordt ingekleed, zodat het
                    publiek een bepaalde interpretatie krijgt aangereikt.{" "}
                    <span className="whitespace-nowrap">(juiste antwoord)</span>
                  </li>
                  <li>C. Het uit elkaar groeien van standpunten.</li>
                  <li>D. Het onbewust selectief onthouden van informatie.</li>
                </ul>
              </div>
            </div>
            <div className="mt-8 text-center">
              <ButtonLink href="/signup" variant="omgekeerd">
                Maak je eigen les
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t-2 border-lijn px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-[62ch] text-center">
              <h2 className="font-display text-3xl text-marine">Prijzen</h2>
              <p className="mt-3 text-base text-tekst-zacht">
                Maandelijks opzegbaar. Bij jaarbetaling 2 maanden gratis.
              </p>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {TIERS.map((tier) => (
                <PrijsKaart key={tier.naam} tier={tier} />
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="border-t-2 border-lijn bg-ivoor-deep px-6 py-24"
        >
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl text-marine">
              Veelgestelde vragen
            </h2>
            <div className="mt-8">
              {FAQS.map((faq) => (
                <details
                  key={faq.vraag}
                  className="group border-b-2 border-lijn py-2"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-display text-xl text-marine">
                    {faq.vraag}
                    <span
                      className="text-marine transition-transform duration-200 group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <p className="mb-4 max-w-[62ch] text-base text-tekst">
                    {faq.antwoord}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
