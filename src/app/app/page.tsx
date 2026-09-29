import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StartScherm } from "@/components/app/StartScherm";
import type { RecentItem } from "@/components/app/RecenteLijst";
import { haalLidmaatschap, haalVerbruik } from "@/lib/school";
import type { GeneratedLesson, GeneratedTest, ReportInput } from "@/lib/types";

/** Hoeveel items er onder "Je laatste werk" passen zonder een lijst te worden. */
const MAX_RECENT = 6;

/**
 * Hoe een rapporttekst in de lijst heet. Bewust de soort en niet het
 * leerling-label: dit overzicht staat open op een computer in een
 * docentenkamer. Zie RecenteLijst.
 */
const RAPPORT_SOORT: Record<ReportInput["outputType"], string> = {
  rapporttekst: "rapporttekst",
  oudergesprek: "oudergesprek-verslag",
  oudermail: "oudermail-concept",
};

export default async function AppDashboard() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [lessenRes, toetsenRes, rapportenRes] = await Promise.all([
    supabase
      .schema("facula")
      .from("lessons")
      .select("id, input, output, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_RECENT),
    supabase
      .schema("facula")
      .from("tests")
      .select("id, input, output, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_RECENT),
    supabase
      .schema("facula")
      .from("reports")
      .select("id, input, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_RECENT),
  ]);

  // Eén aanroep voor verbruik én regime: de database weet of er een
  // schoollicentie, een abonnement of het gratis quotum geldt, en die keuze
  // hoort niet ook hier te staan.
  const verbruik = await haalVerbruik(supabase);
  const lidmaatschap = user ? await haalLidmaatschap(supabase, user.id) : null;

  /*
   * Eén lijst met alle drie de soorten door elkaar, nieuwste eerst. Elk soort
   * haalt eerst zijn eigen laatste zes op; na het samenvoegen blijven er zes
   * over. Dat is genoeg om "waar was ik gebleven" te beantwoorden zonder dat
   * het startscherm een archief wordt.
   */
  const recent: RecentItem[] = [
    ...(lessenRes.data ?? []).map((rij) => {
      const input = rij.input as GeneratedLesson["input"];
      const output = rij.output as Pick<GeneratedLesson, "titel">;
      return {
        id: rij.id as string,
        soort: "les" as const,
        titel: output.titel,
        detail: input.vak + " " + input.niveau + " " + input.leerjaar,
        createdAt: rij.created_at as string,
      };
    }),
    ...(toetsenRes.data ?? []).map((rij) => {
      const input = rij.input as GeneratedTest["input"];
      const output = rij.output as Pick<GeneratedTest, "titel" | "vragen">;
      return {
        id: rij.id as string,
        soort: "toets" as const,
        titel: output.titel,
        detail:
          output.vragen.length + " vragen · " + input.niveau + " " + input.leerjaar,
        createdAt: rij.created_at as string,
      };
    }),
    // Bewust alleen de soort tekst, geen leerling-label: zie RecenteLijst.
    ...(rapportenRes.data ?? []).map((rij) => {
      const input = rij.input as ReportInput;
      return {
        id: rij.id as string,
        soort: "rapport" as const,
        titel: RAPPORT_SOORT[input.outputType] ?? "rapporttekst",
        detail: "zonder naam in dit overzicht",
        createdAt: rij.created_at as string,
      };
    }),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_RECENT);

  const voornaam = user?.email ? user.email.split("@")[0] : "";

  return (
    <StartScherm
      voornaam={voornaam}
      recent={recent}
      verbruik={verbruik}
      lidmaatschap={lidmaatschap}
    />
  );
}
