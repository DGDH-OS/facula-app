import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { haalLidmaatschap } from "@/lib/school";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectieWeergave } from "@/components/school/SectieWeergave";
import type { DelingRij } from "@/components/school/SectieBibliotheek";
import type { DeelbaarItem } from "@/components/school/DeelKiezer";
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

  return (
    <SectieWeergave
      sectieNaam={lid.sectieNaam ?? ""}
      rol={lid.rol}
      delingen={delingen}
      eigenItems={eigenItems}
    />
  );
}
