import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { haalLidmaatschap, ROL_LABEL } from "@/lib/school";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectieBibliotheek, type DelingRij } from "@/components/school/SectieBibliotheek";
import { DeelKiezer, type DeelbaarItem } from "@/components/school/DeelKiezer";
import type { GeneratedLesson, GeneratedTest } from "@/lib/types";

/**
 * De sectiebibliotheek: wat collega's gedeeld hebben, en wat jij kunt delen.
 *
 * Alleen voor wie bij een school hoort; anders bestaat dit scherm niet. Wie wel
 * bij een school hoort maar nog niet in een sectie zit, krijgt uitleg in plaats
 * van een lege lijst: dat is een instelling die zijn beheerder moet doen, en dat
 * hoort er dan ook te staan.
 *
 * Wat hier NIET staat: rapportteksten. Daar staat een leerling in, en delen met
 * een sectie is geen doel waarvoor die gegevens verzameld zijn. De database
 * staat het ook niet toe (de check op `kind` in facula.section_shares).
 */
export default async function SectiePagina() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const lid = await haalLidmaatschap(supabase, user.id);
  if (!lid) {
    notFound();
  }

  if (!lid.sectieId) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          titel="Je sectie"
          uitleg={
            "Je hoort bij " +
            lid.schoolNaam +
            ", maar nog niet bij een sectie. Vraag je beheerder om je in de juiste sectie te zetten, dan kun je lessen en toetsen delen met je collega's en gebruiken wat zij gedeeld hebben."
          }
        />
      </div>
    );
  }

  const [delingenRes, lessenRes, toetsenRes] = await Promise.all([
    supabase
      .schema("facula")
      .from("section_shares")
      .select("id, kind, owner_id, titel, is_sectiestandaard, created_at")
      .order("is_sectiestandaard", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .schema("facula")
      .from("lessons")
      .select("id, input, output, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .schema("facula")
      .from("tests")
      .select("id, input, output, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const delingen: DelingRij[] = (delingenRes.data ?? []).map((rij) => ({
    id: rij.id as string,
    soort: rij.kind as "lessons" | "tests",
    titel: rij.titel as string,
    vanMij: rij.owner_id === user.id,
    isSectiestandaard: rij.is_sectiestandaard === true,
    createdAt: rij.created_at as string,
  }));

  const eigenItems: DeelbaarItem[] = [
    ...(lessenRes.data ?? []).map((rij) => {
      const input = rij.input as GeneratedLesson["input"];
      const output = rij.output as Pick<GeneratedLesson, "titel">;
      return {
        id: rij.id as string,
        soort: "lessons" as const,
        titel: output.titel,
        detail: input.vak + " " + input.niveau + " " + input.leerjaar,
      };
    }),
    ...(toetsenRes.data ?? []).map((rij) => {
      const input = rij.input as GeneratedTest["input"];
      const output = rij.output as Pick<GeneratedTest, "titel" | "vragen">;
      return {
        id: rij.id as string,
        soort: "tests" as const,
        titel: output.titel,
        detail: output.vragen.length + " vragen · " + input.niveau + " " + input.leerjaar,
      };
    }),
  ];

  const magVrijgeven = lid.rol === "sectievoorzitter" || lid.rol === "beheerder";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titel={"Sectie " + (lid.sectieNaam ?? "")}
        uitleg="Materiaal dat je met je sectie deelt, staat hier voor je collega's klaar. Zij kunnen het overnemen en daarna zelf aanpassen, jouw versie blijft zoals hij is."
        status={
          <StatusBadge
            label={ROL_LABEL[lid.rol]}
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
          <DeelKiezer items={eigenItems} sectieNaam={lid.sectieNaam ?? ""} />
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
