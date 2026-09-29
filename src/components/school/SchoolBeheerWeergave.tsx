import { PageHeader, Section } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UsageMeter } from "@/components/ui/UsageMeter";
import { SchoolInstellingen } from "@/components/school/SchoolInstellingen";
import { SectiesBeheer, type SectieRij } from "@/components/school/SectiesBeheer";
import {
  DocentenBeheer,
  type LidRij,
  type UitnodigingRij,
} from "@/components/school/DocentenBeheer";
import { PLAN_LABEL, type SchoolPlan } from "@/lib/school";
import type { Lettertype, PresetNaam } from "@/lib/huisstijl/themes";

/**
 * Het beheerpaneel, zonder databasevragen.
 *
 * Staat los van /app/school/page.tsx om dezelfde reden als StartScherm: die
 * pagina haalt de gegevens op, dit component toont ze. Daardoor kan de
 * voorbeeldroute onder /dev exact dit scherm tonen met verzonnen gegevens, en
 * is een schermafbeelding dus echt dit scherm en geen nabootsing.
 */

export interface SchoolBeheerProps {
  mijnUserId: string;
  schoolNaam: string;
  plan: SchoolPlan;
  pilotTot: string | null;
  seatLimit: number;
  actieveLeden: number;
  plekkenVrij: number;
  totaal: { lessen: number; toetsen: number; rapporten: number };
  /** De poollimiet per soort per maand, of null bij een onbeperkte licentie. */
  poolLimiet: number | null;
  leden: LidRij[];
  secties: SectieRij[];
  uitnodigingen: UitnodigingRij[];
  huisstijl: {
    preset: PresetNaam;
    accent: string;
    tekst: string;
    achtergrond: string;
    lettertype: Lettertype;
    afdwingen: boolean;
    heeftLogo: boolean;
  };
}

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL");
}

export function SchoolBeheerWeergave(props: SchoolBeheerProps) {
  const { pilotTot, poolLimiet, totaal } = props;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titel={props.schoolNaam}
        uitleg="Hier regel je de docenten, de secties en de huisstijl van je school. Je ziet hoeveel er gemaakt wordt, nooit wat erin staat."
        status={
          <StatusBadge
            label={PLAN_LABEL[props.plan]}
            tone={props.plan === "gepauzeerd" ? "warning" : "success"}
            uitleg={pilotTot ? "Pilot tot " + datum(pilotTot) : "De licentie van deze school"}
          />
        }
      />

      <div className="mt-8 space-y-8">
        <Section
          titel="Docentplekken"
          uitleg={
            pilotTot
              ? "De pilot loopt tot " +
                datum(pilotTot) +
                ". Meer plekken of een langere pilot? Neem contact met ons op."
              : "Meer docentplekken nodig? Neem contact met ons op, dan zetten wij ze bij."
          }
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <UsageMeter
              label="Plekken in gebruik"
              gebruikt={props.actieveLeden}
              limiet={props.seatLimit}
            />
            <div>
              <p className="text-base font-semibold text-marine">Gebruik deze maand</p>
              <p className="mt-1 text-base text-tekst-zacht">
                {totaal.lessen} lessen, {totaal.toetsen} toetsen en {totaal.rapporten}{" "}
                rapportteksten.
                {poolLimiet
                  ? " Jullie licentie heeft er " + poolLimiet + " per soort per maand."
                  : " Jullie licentie heeft geen maandlimiet."}
              </p>
            </div>
          </div>
        </Section>

        <Section
          titel="Docenten"
          uitleg="Nodig collega's uit, geef ze een rol en zet ze in een sectie."
        >
          <DocentenBeheer
            mijnUserId={props.mijnUserId}
            leden={props.leden}
            secties={props.secties.map((s) => ({ id: s.id, naam: s.naam }))}
            uitnodigingen={props.uitnodigingen}
            plekkenVrij={props.plekkenVrij}
          />
        </Section>

        <Section
          titel="Secties"
          uitleg="Een sectie is de groep waarmee een docent materiaal kan delen. Meestal een vak, soms een team."
        >
          <SectiesBeheer secties={props.secties} />
        </Section>

        <Section
          titel="Huisstijl van de school"
          uitleg="Kleuren, lettertype en logo voor alles wat je docenten downloaden."
        >
          <SchoolInstellingen
            naam={props.schoolNaam}
            preset={props.huisstijl.preset}
            accent={props.huisstijl.accent}
            tekst={props.huisstijl.tekst}
            achtergrond={props.huisstijl.achtergrond}
            lettertype={props.huisstijl.lettertype}
            afdwingen={props.huisstijl.afdwingen}
            heeftLogo={props.huisstijl.heeftLogo}
          />
        </Section>

        <Section titel="Wat hier nog niet zit">
          <ul className="space-y-2 text-base text-tekst">
            <li>
              Inloggen met het schoolaccount (Microsoft of Google) komt later. Nu
              logt elke docent in met een e-mailadres en een wachtwoord.
            </li>
            <li>
              Facturatie loopt nog buiten Facula om. Wij sturen de jaarfactuur en
              zetten het aantal docentplekken voor je klaar.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
