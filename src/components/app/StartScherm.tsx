import { StatusBadge } from "@/components/ui/StatusBadge";
import { UpgradeButton } from "@/components/ui/UpgradeButton";
import { Tile } from "@/components/ui/Tile";
import { EmptyState, PageHeader, Section } from "@/components/ui/PageHeader";
import { UsageMeter } from "@/components/ui/UsageMeter";
import { ButtonLink } from "@/components/ui/Button";
import { LesIcon, ToetsIcon, RapportIcon, AssistentIcon } from "@/components/ui/icons";
import { RecenteLijst, type RecentItem } from "@/components/app/RecenteLijst";
import {
  ROL_LABEL,
  ROL_UITLEG,
  verbruikUitleg,
  type SchoolLidmaatschap,
  type Verbruik,
  type VerbruikRegime,
} from "@/lib/school";

/**
 * Het startscherm, zonder databasevragen.
 *
 * Staat los van /app/page.tsx omdat die pagina de gegevens ophaalt en dit
 * component ze alleen toont. Dat maakt twee dingen mogelijk: de voorbeeldroute
 * onder /dev kan dit scherm met verzonnen gegevens tonen (voor schermafbeeldingen
 * zonder in te loggen op een echte database), en de opbouw van het scherm is te
 * lezen zonder door queries heen te kijken.
 */

/** Het regime in een woord op een badge. Geen jargon, geen Engels. */
const REGIME_LABEL: Record<VerbruikRegime, string> = {
  gratis: "Gratis",
  abonnement: "Abonnement",
  school_onbeperkt: "Schoollicentie",
  school_pool: "Schoollicentie",
};

export function StartScherm({
  voornaam,
  recent,
  verbruik,
  lidmaatschap,
}: {
  voornaam: string;
  recent: RecentItem[];
  verbruik: Verbruik;
  lidmaatschap: SchoolLidmaatschap | null;
}) {
  return (
    <div>
      <PageHeader
        titel={voornaam ? "Welkom, " + voornaam : "Welkom"}
        uitleg="Kies hieronder wat je wilt maken. Je hoeft alleen je leerdoel in te vullen."
      />

      <h2 className="mt-10 font-display text-2xl text-marine">Wat wil je maken?</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <Tile
          href="/app/assistent"
          icoon={<AssistentIcon />}
          kop="De Assistent"
          zin="Kies een module. Geen chatbot, geen leerlingnamen, jij blijft verantwoordelijk."
        />
        <Tile
          href="/app/lessons/new"
          icoon={<LesIcon />}
          kop="Een les maken"
          zin="Vul je leerdoel in en krijg een volledige les met opdrachten."
        />
        <Tile
          href="/app/tests/new"
          icoon={<ToetsIcon />}
          kop="Een toets maken"
          zin="Vragen en antwoordsleutel bij het leerdoel van je les."
        />
        <Tile
          href="/app/reports/new"
          icoon={<RapportIcon />}
          kop="Een rapport schrijven"
          zin="Een rapporttekst of oudermail in jouw woorden."
          extra={
            <StatusBadge
              label="Let op leerlinggegevens"
              tone="warning"
              uitleg="Gebruik geen volledige namen: dit valt onder de AVG"
            />
          }
        />
      </div>

      {lidmaatschap && (
        <Section
          className="mt-10"
          titel={lidmaatschap.schoolNaam}
          uitleg={
            lidmaatschap.sectieNaam
              ? "Je werkt hier als " +
                ROL_LABEL[lidmaatschap.rol].toLowerCase() +
                " in de sectie " +
                lidmaatschap.sectieNaam +
                "."
              : "Je werkt hier als " +
                ROL_LABEL[lidmaatschap.rol].toLowerCase() +
                ". Je bent nog niet aan een sectie gekoppeld, vraag je beheerder daarom."
          }
          actie={
            <ButtonLink href="/app/sectie" variant="secondary">
              Naar de sectie
            </ButtonLink>
          }
        />
      )}

      <section id="werk" className="mt-14">
        <h2 className="font-display text-2xl text-marine">Je laatste werk</h2>
        <div className="mt-4">
          {recent.length === 0 ? (
            <EmptyState
              tekst="Hier komt te staan wat je maakt: lessen, toetsen en rapportteksten. Je kunt ze daarna altijd opnieuw openen en downloaden."
              actie={
                <ButtonLink href="/app/lessons/new" variant="primary">
                  Maak je eerste les
                </ButtonLink>
              }
            />
          ) : (
            <RecenteLijst items={recent} />
          )}
        </div>
      </section>

      <Section
        className="mt-14"
        titel="Gebruik deze maand"
        uitleg={verbruikUitleg(verbruik)}
        actie={verbruik.regime === "gratis" ? <UpgradeButton /> : undefined}
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            label={REGIME_LABEL[verbruik.regime]}
            tone={verbruik.regime === "gratis" ? "neutral" : "success"}
            uitleg={verbruikUitleg(verbruik)}
          />
          {lidmaatschap && (
            <StatusBadge
              label={ROL_LABEL[lidmaatschap.rol]}
              tone="neutral"
              uitleg={ROL_UITLEG[lidmaatschap.rol]}
            />
          )}
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          <UsageMeter
            label={verbruik.regime === "school_pool" ? "Lessen van de school" : "Lessen"}
            gebruikt={verbruik.lessons}
            limiet={verbruik.limiet}
          />
          <UsageMeter
            label={verbruik.regime === "school_pool" ? "Toetsen van de school" : "Toetsen"}
            gebruikt={verbruik.tests}
            limiet={verbruik.limiet}
          />
          <UsageMeter
            label={
              verbruik.regime === "school_pool"
                ? "Rapportteksten van de school"
                : "Rapportteksten"
            }
            gebruikt={verbruik.reports}
            limiet={verbruik.limiet}
          />
        </div>
      </Section>
    </div>
  );
}
