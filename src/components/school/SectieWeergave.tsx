import { PageHeader, Section } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectieBibliotheek, type DelingRij } from "@/components/school/SectieBibliotheek";
import { DeelKiezer, type DeelbaarItem } from "@/components/school/DeelKiezer";
import { ROL_LABEL, type SchoolRol } from "@/lib/school";

/**
 * De sectiebibliotheek, zonder databasevragen. Zie SchoolBeheerWeergave voor
 * waarom het scherm en het ophalen gescheiden zijn.
 */
export function SectieWeergave({
  sectieNaam,
  rol,
  delingen,
  eigenItems,
}: {
  sectieNaam: string;
  rol: SchoolRol;
  delingen: DelingRij[];
  eigenItems: DeelbaarItem[];
}) {
  const magVrijgeven = rol === "sectievoorzitter" || rol === "beheerder";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titel={"Sectie " + sectieNaam}
        uitleg="Materiaal dat je met je sectie deelt, staat hier voor je collega's klaar. Zij kunnen het overnemen en daarna zelf aanpassen, jouw versie blijft zoals hij is."
        status={
          <StatusBadge
            label={ROL_LABEL[rol]}
            tone="neutral"
            uitleg={
              magVrijgeven
                ? "Je kunt materiaal vrijgeven als sectiestandaard"
                : "Je kunt delen en overnemen"
            }
          />
        }
      />

      <div className="mt-8 space-y-8">
        <Section
          titel="Gedeeld in je sectie"
          uitleg="Een sectiestandaard staat bovenaan: dat is het materiaal waarvan je sectie heeft afgesproken dat het de norm is."
        >
          <SectieBibliotheek delingen={delingen} magVrijgeven={magVrijgeven} />
        </Section>

        <Section
          titel="Zelf iets delen"
          uitleg="Kies een les of toets van jezelf. Je collega's zien de inhoud zoals hij nu is; latere wijzigingen bij jou veranderen de deling niet."
        >
          <DeelKiezer items={eigenItems} sectieNaam={sectieNaam} />
        </Section>

        <Section titel="Waarom rapportteksten hier niet staan">
          <p className="max-w-[70ch] text-base text-tekst">
            In een rapporttekst staat een leerling. Die gegevens zijn verzameld om
            één tekst te schrijven, niet om met collega&apos;s te delen, dus dat
            kan in Facula niet. Lessen en toetsen gaan niet over een leerling en
            zijn daarom wel te delen.
          </p>
        </Section>
      </div>
    </div>
  );
}
