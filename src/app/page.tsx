import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

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

const TIERS = [
  {
    naam: "Starter",
    prijs: 25,
    beschrijving: "Voor de docent die net begint met digitaal lesmateriaal.",
    features: [
      "15 lessen per maand",
      "10 toetsen per maand",
      "1 vak naar keuze",
      "Export naar PDF",
    ],
    uitgelicht: false,
  },
  {
    naam: "Actief",
    prijs: 35,
    beschrijving: "Voor de docent die structureel met Facula werkt.",
    features: [
      "Onbeperkt lessen",
      "Onbeperkt toetsen",
      "Alle vakken",
      "Export naar PowerPoint, Word en PDF",
      "Bewerken & losse onderdelen regenereren",
    ],
    uitgelicht: true,
  },
  {
    naam: "Premium",
    prijs: 49,
    beschrijving: "Voor de docent die ook eigen huisstijl en sjablonen wil.",
    features: [
      "Alles uit Actief",
      "Eigen sjabloon/huisstijl uploaden",
      "Prioriteit bij nieuwe vakken en functies",
      "Persoonlijke onboarding",
    ],
    uitgelicht: false,
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
        <section className="relative overflow-hidden bg-[var(--color-ivoor)] px-6 py-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-display text-sm uppercase tracking-[0.3em] text-[var(--color-goud)]">
              Facula
            </p>
            <h1 className="mt-6 font-display text-4xl leading-[1.15] text-[var(--color-marine)] sm:text-5xl md:text-6xl">
              Lesmateriaal dat past bij jouw kerndoelen,
              <br className="hidden sm:block" /> in minuten.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-inkt)]/75">
              Facula is de premium les- en toetssuite voor Nederlandse
              docenten. Voer je leerdoel in, en krijg een complete,
              herkenbare les en bijpassende toets — geen chatbot, maar een
              vakinstrument.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-full bg-[var(--color-marine)] px-8 py-3.5 text-sm font-medium text-[var(--color-ivoor)] shadow-sm transition hover:bg-[var(--color-marine-deep)]"
              >
                Probeer gratis
              </Link>
              <Link
                href="#voorbeeld"
                className="rounded-full border border-[var(--color-marine)]/30 px-8 py-3.5 text-sm font-medium text-[var(--color-marine)] transition hover:bg-[var(--color-marine)]/5"
              >
                Bekijk voorbeeld-output
              </Link>
            </div>
          </div>
        </section>

        {/* Hoe het werkt */}
        <section id="hoe-het-werkt" className="border-t border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl text-[var(--color-marine)]">
                Hoe het werkt
              </h2>
              <p className="mt-3 text-[var(--color-inkt)]/70">
                Drie stappen tussen een leeg vel en een complete les.
              </p>
            </div>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {STAPPEN.map((stap) => (
                <div key={stap.nummer}>
                  <div className="font-display text-4xl text-[var(--color-goud)]">
                    {stap.nummer}
                  </div>
                  <h3 className="mt-4 font-display text-xl text-[var(--color-marine)]">
                    {stap.titel}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-inkt)]/70">
                    {stap.tekst}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vakken */}
        <section id="vakken" className="border-t border-[var(--color-lijn)] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl text-[var(--color-marine)]">
                Vakken die Facula nu al kent
              </h2>
              <p className="mt-3 text-[var(--color-inkt)]/70">
                Gebouwd voor havo en vwo, met NL-kerndoelen als uitgangspunt.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {VAKKEN.map((vak) => (
                <div
                  key={vak.naam}
                  className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor)] p-6 transition hover:border-[var(--color-goud)]/60"
                >
                  <h3 className="font-display text-lg text-[var(--color-marine)]">
                    {vak.naam}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-inkt)]/70">
                    {vak.beschrijving}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Voorbeeld-output */}
        <section id="voorbeeld" className="border-t border-[var(--color-lijn)] bg-[var(--color-marine)] px-6 py-24 text-[var(--color-ivoor)]">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl">Voorbeeld-output</h2>
              <p className="mt-3 text-[var(--color-ivoor)]/70">
                Een fragment uit een echte, door Facula gegenereerde les voor
                havo 4 maatschappijleer.
              </p>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-ivoor)]/15 bg-[var(--color-marine-deep)] p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-goud)]">
                  Les 1 · Kernbegrippen
                </p>
                <h3 className="mt-3 font-display text-xl">
                  Referentiekader &amp; selectieve waarneming
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-ivoor)]/75">
                  <strong className="text-[var(--color-ivoor)]">Referentiekader:</strong>{" "}
                  het geheel van waarden, normen, ervaringen en kennis waarmee
                  iemand de werkelijkheid interpreteert en beoordeelt.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-ivoor)]/75">
                  <strong className="text-[var(--color-ivoor)]">Casus:</strong>{" "}
                  68% van de 16- tot 24-jarigen haalt dagelijks nieuws via
                  social media, tegenover 31% via een traditionele bron
                  (CBS, 2024).
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-ivoor)]/15 bg-[var(--color-marine-deep)] p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-goud)]">
                  Bijpassende toets · Vraag 3
                </p>
                <h3 className="mt-3 font-display text-xl">Meerkeuzevraag</h3>
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-ivoor)]/75">
                  Welke omschrijving hoort bij het begrip &quot;framing&quot;?
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--color-ivoor)]/75">
                  <li>A. Het bewust misleiden met onjuiste feiten.</li>
                  <li className="rounded bg-[var(--color-goud)]/20 px-2 py-1">
                    B. De manier waarop een boodschap wordt ingekleed, zodat
                    het publiek een bepaalde interpretatie krijgt aangereikt.
                  </li>
                  <li>C. Het uit elkaar groeien van standpunten.</li>
                  <li>D. Het onbewust selectief onthouden van informatie.</li>
                </ul>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/signup"
                className="inline-block rounded-full bg-[var(--color-ivoor)] px-8 py-3.5 text-sm font-medium text-[var(--color-marine)] transition hover:bg-[var(--color-ivoor)]/90"
              >
                Genereer je eigen les
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-[var(--color-lijn)] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-display text-3xl text-[var(--color-marine)]">
                Prijzen
              </h2>
              <p className="mt-3 text-[var(--color-inkt)]/70">
                Maandelijks opzegbaar. Bij jaarbetaling 2 maanden gratis.
              </p>
            </div>
            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              {TIERS.map((tier) => (
                <div
                  key={tier.naam}
                  className={`flex flex-col rounded-2xl border p-8 ${
                    tier.uitgelicht
                      ? "border-[var(--color-marine)] bg-[var(--color-marine)] text-[var(--color-ivoor)] shadow-lg"
                      : "border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] text-[var(--color-inkt)]"
                  }`}
                >
                  {tier.uitgelicht && (
                    <span className="mb-4 inline-block w-fit rounded-full bg-[var(--color-goud)] px-3 py-1 text-xs font-medium text-[var(--color-marine-deep)]">
                      Meest gekozen
                    </span>
                  )}
                  <h3 className="font-display text-xl">{tier.naam}</h3>
                  <p
                    className={`mt-2 text-sm ${
                      tier.uitgelicht ? "text-[var(--color-ivoor)]/70" : "text-[var(--color-inkt)]/70"
                    }`}
                  >
                    {tier.beschrijving}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-4xl">€{tier.prijs}</span>
                    <span
                      className={`text-sm ${
                        tier.uitgelicht ? "text-[var(--color-ivoor)]/60" : "text-[var(--color-inkt)]/60"
                      }`}
                    >
                      / maand
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      tier.uitgelicht ? "text-[var(--color-ivoor)]/50" : "text-[var(--color-inkt)]/50"
                    }`}
                  >
                    of €{tier.prijs * 10} per jaar — 2 maanden gratis
                  </p>
                  <ul className="mt-8 flex-1 space-y-3 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span
                          className={
                            tier.uitgelicht ? "text-[var(--color-goud)]" : "text-[var(--color-groen)]"
                          }
                        >
                          ✓
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-8 rounded-full px-6 py-3 text-center text-sm font-medium transition ${
                      tier.uitgelicht
                        ? "bg-[var(--color-ivoor)] text-[var(--color-marine)] hover:bg-[var(--color-ivoor)]/90"
                        : "bg-[var(--color-marine)] text-[var(--color-ivoor)] hover:bg-[var(--color-marine-deep)]"
                    }`}
                  >
                    Start proefperiode
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] px-6 py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl text-[var(--color-marine)]">
              Veelgestelde vragen
            </h2>
            <div className="mt-10 divide-y divide-[var(--color-lijn)]">
              {FAQS.map((faq) => (
                <details key={faq.vraag} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg text-[var(--color-marine)]">
                    {faq.vraag}
                    <span className="ml-4 text-[var(--color-goud)] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-inkt)]/70">
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
