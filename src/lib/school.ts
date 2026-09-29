import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side kant van het schoolmodel: wie is deze docent binnen zijn school,
 * en wat mag hij daar.
 *
 * Alles loopt via de meegegeven, al geauthenticeerde client. De user-id komt
 * dus altijd uit de sessie en nooit uit een request-body; de policies in
 * 20260929130000_facula_school.sql zijn de laag daaronder. Deze module beslist
 * niets over toegang, hij leest alleen wat de database teruggeeft.
 *
 * Bewust drie kleine leesvragen in plaats van één met een geneste select: de
 * verwijzing naar een sectie is een samengestelde foreign key (section_id,
 * school_id), en daar is PostgREST-embedding niet op te vertrouwen. Drie
 * eenvoudige queries die altijd doen wat er staat, is hier beter dan één
 * slimme.
 */

export type SchoolRol = "beheerder" | "sectievoorzitter" | "docent";
export type SchoolPlan = "pilot" | "actief" | "gepauzeerd";
export type QuotaModus = "onbeperkt" | "pool";

export interface SchoolLidmaatschap {
  schoolId: string;
  schoolNaam: string;
  rol: SchoolRol;
  sectieId: string | null;
  sectieNaam: string | null;
  plan: SchoolPlan;
  pilotTot: string | null;
  seatLimit: number;
  quotaModus: QuotaModus;
  maandPool: number | null;
  huisstijlAfdwingen: boolean;
}

function isRol(waarde: unknown): waarde is SchoolRol {
  return waarde === "beheerder" || waarde === "sectievoorzitter" || waarde === "docent";
}

/**
 * Het actieve lidmaatschap van de ingelogde docent, of null.
 *
 * Null betekent hier altijd hetzelfde: deze docent hoort bij geen school en
 * werkt op zijn persoonlijke account. Een leesfout wordt ook null, met een
 * logregel: een kapotte schoolquery mag een docent niet uit zijn eigen app
 * houden.
 */
export async function haalLidmaatschap(
  supabase: SupabaseClient,
  userId: string
): Promise<SchoolLidmaatschap | null> {
  const { data: lid, error: lidFout } = await supabase
    .schema("facula")
    .from("school_members")
    .select("school_id, role, section_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (lidFout) {
    console.error("Schoollidmaatschap ophalen mislukt", lidFout);
    return null;
  }
  if (!lid || !isRol(lid.role)) return null;

  const { data: school, error: schoolFout } = await supabase
    .schema("facula")
    .from("schools")
    .select(
      "id, name, plan, pilot_ends_at, seat_limit, quota_mode, monthly_pool, enforce_huisstijl"
    )
    .eq("id", lid.school_id)
    .maybeSingle();

  if (schoolFout || !school) {
    console.error("School ophalen mislukt", schoolFout);
    return null;
  }

  let sectieNaam: string | null = null;
  if (lid.section_id) {
    const { data: sectie } = await supabase
      .schema("facula")
      .from("sections")
      .select("naam")
      .eq("id", lid.section_id)
      .maybeSingle();
    sectieNaam = sectie?.naam ?? null;
  }

  return {
    schoolId: school.id as string,
    schoolNaam: school.name as string,
    rol: lid.role,
    sectieId: (lid.section_id as string | null) ?? null,
    sectieNaam,
    plan: school.plan as SchoolPlan,
    pilotTot: (school.pilot_ends_at as string | null) ?? null,
    seatLimit: school.seat_limit as number,
    quotaModus: school.quota_mode as QuotaModus,
    maandPool: (school.monthly_pool as number | null) ?? null,
    huisstijlAfdwingen: school.enforce_huisstijl === true,
  };
}

/** Loopt de licentie van deze school nu? Zelfde regel als save_with_quota_v2. */
export function licentieLoopt(lid: SchoolLidmaatschap): boolean {
  if (lid.plan === "actief") return true;
  if (lid.plan !== "pilot") return false;
  if (!lid.pilotTot) return true;
  return new Date(lid.pilotTot).getTime() > Date.now();
}

/** Nederlandse woorden voor de rollen. Nooit "seat" of "admin" op het scherm. */
export const ROL_LABEL: Record<SchoolRol, string> = {
  beheerder: "Beheerder",
  sectievoorzitter: "Sectievoorzitter",
  docent: "Docent",
};

export const ROL_UITLEG: Record<SchoolRol, string> = {
  beheerder:
    "Regelt docenten, secties en de huisstijl van de school. Ziet hoeveel er gemaakt wordt, niet wat.",
  sectievoorzitter:
    "Werkt als docent en kan materiaal van de sectie vrijgeven als sectiestandaard.",
  docent: "Maakt lessen, toetsen en rapportteksten, en kan met de sectie delen.",
};

export const PLAN_LABEL: Record<SchoolPlan, string> = {
  pilot: "Pilot",
  actief: "Licentie actief",
  gepauzeerd: "Gepauzeerd",
};

/**
 * Het verbruik van deze maand plus het geldende regime, uit
 * facula.mijn_verbruik(). Eén bron, zodat de app de regimekeuze niet naast de
 * database nabouwt; dat is precies het soort dubbele logica dat uit elkaar gaat
 * lopen.
 */
export type VerbruikRegime = "gratis" | "abonnement" | "school_onbeperkt" | "school_pool";

export interface Verbruik {
  lessons: number;
  tests: number;
  reports: number;
  regime: VerbruikRegime;
  /** Limiet per soort per maand, of null als er geen limiet is. */
  limiet: number | null;
  schoolNaam: string | null;
}

const VEILIG_VERBRUIK: Verbruik = {
  lessons: 0,
  tests: 0,
  reports: 0,
  regime: "gratis",
  limiet: null,
  schoolNaam: null,
};

export async function haalVerbruik(supabase: SupabaseClient): Promise<Verbruik> {
  const { data, error } = await supabase
    .schema("facula")
    .rpc("mijn_verbruik")
    .single();

  if (error || !data) {
    // Het startscherm mag hier niet op stuklopen. Zonder cijfers is de meter
    // leeg en zonder limiet toont hij geen balk; de echte limiet valt toch in
    // de database bij het opslaan.
    console.error("mijn_verbruik mislukt", error);
    return VEILIG_VERBRUIK;
  }

  const rij = data as {
    lessons_generated: number;
    tests_generated: number;
    reports_generated: number;
    regime: string;
    limiet: number | null;
    school_naam: string | null;
  };

  const regime: VerbruikRegime =
    rij.regime === "abonnement" ||
    rij.regime === "school_onbeperkt" ||
    rij.regime === "school_pool"
      ? rij.regime
      : "gratis";

  return {
    lessons: rij.lessons_generated,
    tests: rij.tests_generated,
    reports: rij.reports_generated,
    regime,
    limiet: rij.limiet ?? null,
    schoolNaam: rij.school_naam ?? null,
  };
}

/** Eén zin die uitlegt welk regime er geldt. Gewone woorden, geen jargon. */
export function verbruikUitleg(verbruik: Verbruik): string {
  switch (verbruik.regime) {
    case "school_onbeperkt":
      return verbruik.schoolNaam
        ? "Je werkt via de licentie van " + verbruik.schoolNaam + ". Er is geen maandlimiet."
        : "Je werkt via de licentie van je school. Er is geen maandlimiet.";
    case "school_pool":
      return verbruik.schoolNaam
        ? "Je werkt via de licentie van " +
            verbruik.schoolNaam +
            ". De school heeft per maand een gezamenlijk aantal per soort."
        : "Je werkt via de licentie van je school, met een gezamenlijk aantal per maand.";
    case "abonnement":
      return "Je hebt een abonnement. Er is geen maandlimiet.";
    default:
      return "Je gebruikt Facula gratis. Per soort kun je er " +
        (verbruik.limiet ?? 0) +
        " per maand maken.";
  }
}
