import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl text-marine">
            Privacyverklaring
          </h1>
          <p className="mt-4 text-base text-tekst-zacht">
            Laatst bijgewerkt: 29 september 2026
          </p>
          <p className="mt-6 text-base text-tekst">
            Deze pagina legt in gewone taal uit welke gegevens Facula van je
            verzamelt, waarom, en welke rechten je hebt. Gebruik je ook de
            rapport-module voor oudercommunicatie? Lees dan ook de{" "}
            <Link
              href="/privacy/rapport-module"
              className="font-semibold text-marine underline underline-offset-4"
            >
              aanvullende uitleg over die module
            </Link>
            , want die verwerkt mogelijk leerlinggegevens.
          </p>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="font-display text-xl text-marine">
                Wie we zijn
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Facula is een dienst van DGDH OS. DGDH OS is de
                verwerkingsverantwoordelijke voor de gegevens die je als
                docent invoert. Vragen over je gegevens? Mail naar{" "}
                <a
                  href="mailto:info@dgdh-os.com"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  info@dgdh-os.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Welke gegevens we verzamelen
              </h2>
              <ul className="mt-2 space-y-2 text-base leading-relaxed text-tekst">
                <li>
                  • Je e-mailadres en een versleuteld wachtwoord, voor je
                  account.
                </li>
                <li>
                  • De lessen, toetsen en rapportteksten die je genereert, en
                  eerdere versies daarvan.
                </li>
                <li>
                  • Hoeveel lessen, toetsen en rapporten je deze maand hebt
                  gemaakt, om je gratis quotum bij te houden.
                </li>
                <li>
                  • Je abonnementsstatus. Zodra betalen live gaat, ook een
                  klant-ID bij onze betaalverwerker Stripe.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Waarvoor en op welke grondslag
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                We gebruiken deze gegevens om Facula te laten werken: inloggen,
                lesmateriaal genereren en opslaan, en je quotum en
                abonnement bijhouden. De grondslag hiervoor is de uitvoering
                van de overeenkomst die je met ons aangaat bij het aanmaken
                van een account.
              </p>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Gebruik je de rapport-module en typ je daar aantekeningen over
                een leerling in? Dan ben jij, of de school waar je voor werkt,
                de verwerkingsverantwoordelijke voor die leerlinggegevens.
                DGDH OS is dan verwerker. Zie{" "}
                <Link
                  href="/privacy/rapport-module"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  de uitleg bij de rapport-module
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Bewaartermijn
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                We bewaren je gegevens zolang je account bestaat. Verwijder je
                je account, dan verwijderen we je gegevens direct uit onze
                actieve database. Back-ups van onze hostingpartij roteren
                automatisch, waardoor een kopie van je gegevens daar nog
                enige tijd kan naklinken voordat die vanzelf wordt
                overschreven.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Wie je gegevens verwerken
              </h2>
              <ul className="mt-2 space-y-2 text-base leading-relaxed text-tekst">
                <li>
                  • <strong>Supabase</strong>: database en inlogsysteem,
                  gegevens opgeslagen in de EU (Ierland).
                </li>
                <li>
                  • <strong>Vercel</strong>: hosting van de website en de
                  servers die de app draaiend houden.
                </li>
                <li>
                  • <strong>Stripe</strong>: zodra betalen live gaat, voor
                  het afhandelen van abonnementsbetalingen.
                </li>
                <li>
                  • <strong>Google Vertex AI</strong>: voor gemarkeerde
                  AI-functies zoals les- en toetsgeneratie, in een
                  EU-regio. De Assistent gebruikt dit niet.
                </li>
              </ul>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                De Assistent belt zelf geen externe AI-dienst en stuurt
                geen invoer naar buiten. Andere Facula-functies die als
                AI zijn gemarkeerd, kunnen Google Vertex AI in een
                EU-regio gebruiken. Meer uitleg:{" "}
                <Link
                  href="/ai"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  AI in Facula
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                De Facula Assistent
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                De Assistent is een routeerhulp naar bestaande modules.
                Je kunt hier geen namen, e-mailadressen of leerlingteksten
                invullen. Hij zet geen persoonsgegevens in een webadres
                en vult ontbrekende velden niet zelf in. Meer uitleg:{" "}
                <Link
                  href="/ai"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  AI in Facula
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Doorgifte buiten de EU
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Je gegevens worden opgeslagen op servers in de EU. Vercel is
                een Amerikaans bedrijf, maar de servers die Facula gebruikt
                staan in de EU. Er vindt geen structurele doorgifte van je
                gegevens naar buiten de EU plaats.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Cookies
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Facula gebruikt geen tracking- of advertentiecookies en geen
                analytics. De enige cookies die worden geplaatst, zijn
                functionele inlogcookies van Supabase om je sessie te
                onthouden. Daarvoor is geen cookiebanner nodig.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Jouw rechten
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Je hebt recht op inzage, correctie en verwijdering van je
                gegevens, en op het meenemen van je gegevens (dataportabiliteit).
                Log in en ga naar je{" "}
                <Link
                  href="/app/account"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  accountpagina
                </Link>{" "}
                om je gegevens te downloaden of je account te verwijderen. Kom
                je er met ons niet uit? Dan kun je een klacht indienen bij de{" "}
                <a
                  href="https://autoriteitpersoonsgegevens.nl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  Autoriteit Persoonsgegevens
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Contact
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Vragen over deze privacyverklaring? Mail naar{" "}
                <a
                  href="mailto:info@dgdh-os.com"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  info@dgdh-os.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
