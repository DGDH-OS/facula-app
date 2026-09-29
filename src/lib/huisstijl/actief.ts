import type { SupabaseClient } from "@supabase/supabase-js";
import {
  eigenLogoScope,
  haalHuisstijl,
  haalLogoVanPad,
  schrijfLogoNaarTemp,
  type LogoScope,
} from "./server";
import { resolveHuisstijl, type Huisstijl } from "./themes";
import type { Logo, LogoBestand } from "./logo";

/**
 * Welke huisstijl geldt er nu voor deze docent: zijn eigen, of die van zijn
 * school.
 *
 * De regel, in woorden:
 *
 *   1. hoort de docent bij geen school, dan geldt zijn eigen huisstijl;
 *   2. dwingt de school haar huisstijl af (enforce_huisstijl), dan geldt die,
 *      en wat de docent zelf heeft ingesteld doet niet mee. Dat is precies wat
 *      een school ervoor wil betalen: alles wat de deur uit gaat ziet er
 *      hetzelfde uit;
 *   3. dwingt de school niets af, dan geldt de eigen huisstijl van de docent,
 *      tenzij hij er nog geen heeft ingesteld. Dan is de schoolhuisstijl de
 *      betere standaard dan het ivoor van Facula: een nieuwe docent op een
 *      school hoort niet eerst iets in te stellen om er schooleigen uit te zien.
 *
 * Deze module leest en beslist, en schrijft nooit. De schoolhuisstijl komt uit
 * facula.school_huisstijl() (security definer), die zelf controleert of de
 * aanvrager lid is.
 */

export type HuisstijlBron = "eigen" | "school";

export interface ActieveHuisstijl {
  /** De huisstijl die nu geldt, dus wat op het scherm en in de export komt. */
  huisstijl: Huisstijl;
  bron: HuisstijlBron;
  /** De eigen huisstijl van de docent, voor het instelscherm. */
  eigen: Huisstijl;
  schoolNaam: string | null;
  /** True als de school haar huisstijl afdwingt en eigen kleuren niet meedoen. */
  afdwingen: boolean;
  /**
   * Waartegen het logopad gecontroleerd moet worden: het eigen pad van de
   * docent of dat van de school. Zonder dit onderscheid zou een schoollogo
   * weggegooid worden met de melding dat het pad niet bij deze gebruiker hoort.
   */
  logoScope: LogoScope;
}

interface SchoolHuisstijlRij {
  preset: string | null;
  accent: string | null;
  tekst: string | null;
  achtergrond: string | null;
  lettertype: string | null;
  schoolnaam: string | null;
  logo_path: string | null;
  logo_mime: string | null;
  enforce_huisstijl: boolean | null;
}

/** Heeft deze docent zelf iets ingesteld, of staat er nog geen rij? */
async function heeftEigenHuisstijl(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .schema("facula")
    .from("huisstijl")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Bij twijfel: doen alsof hij er is, zodat de eigen stijl geldt en er niets
    // onverwacht verandert aan wat de docent ziet.
    console.error("Eigen huisstijl controleren mislukt", error);
    return true;
  }
  return data !== null;
}

/**
 * De school-id uit een logopad halen ('school/<uuid>/logo').
 *
 * Nodig omdat facula.school_huisstijl() de school-id niet apart teruggeeft: hij
 * geeft de huisstijl, en het pad is de enige plek waar de id in staat. Geen pad
 * betekent geen logo, en dan hoeft er ook niets gecontroleerd te worden.
 */
function schoolIdUitPad(pad: string | null): string | null {
  if (!pad) return null;
  const delen = pad.split("/");
  if (delen.length !== 3) return null;
  if (delen[0] !== "school" || delen[2] !== "logo") return null;
  return delen[1].length === 36 ? delen[1] : null;
}

export async function haalActieveHuisstijl(
  supabase: SupabaseClient,
  userId: string
): Promise<ActieveHuisstijl> {
  const eigen = await haalHuisstijl(supabase, userId);

  const alleenEigen = (schoolNaam: string | null): ActieveHuisstijl => ({
    huisstijl: eigen,
    bron: "eigen",
    eigen,
    schoolNaam,
    afdwingen: false,
    logoScope: eigenLogoScope(userId),
  });

  const { data, error } = await supabase.schema("facula").rpc("school_huisstijl");
  if (error) {
    console.error("Schoolhuisstijl ophalen mislukt", error);
    return alleenEigen(null);
  }

  const rijen = (Array.isArray(data) ? data : data ? [data] : []) as SchoolHuisstijlRij[];
  const rij = rijen[0];
  if (!rij) return alleenEigen(null);

  const afdwingen = rij.enforce_huisstijl === true;
  const gebruikSchool = afdwingen || !(await heeftEigenHuisstijl(supabase, userId));
  if (!gebruikSchool) return alleenEigen(rij.schoolnaam);

  // Dezelfde resolver als voor een eigen rij: een plek waar presets, kleuren en
  // de contrastcheck geldig gemaakt worden.
  const schoolStijl = resolveHuisstijl({
    preset: rij.preset,
    accent: rij.accent,
    tekst: rij.tekst,
    achtergrond: rij.achtergrond,
    lettertype: rij.lettertype,
    schoolnaam: rij.schoolnaam,
    logo_path: rij.logo_path,
    logo_mime: rij.logo_mime,
    logo_standaard_aan: true,
  });

  return {
    huisstijl: schoolStijl,
    bron: "school",
    eigen,
    schoolNaam: rij.schoolnaam,
    afdwingen,
    logoScope: { soort: "school", schoolId: schoolIdUitPad(rij.logo_path) },
  };
}

/** Het logo dat bij de actieve huisstijl hoort, of null. */
export async function haalActiefLogo(
  supabase: SupabaseClient,
  actief: ActieveHuisstijl
): Promise<Logo | null> {
  return haalLogoVanPad(supabase, actief.huisstijl, actief.logoScope);
}

/** Hetzelfde logo, als bestand op schijf voor pptxgenjs. */
export async function haalActiefLogoBestand(
  supabase: SupabaseClient,
  actief: ActieveHuisstijl
): Promise<LogoBestand | null> {
  const logo = await haalActiefLogo(supabase, actief);
  if (!logo) return null;
  return schrijfLogoNaarTemp(logo, actief.huisstijl.logoPath ?? "logo");
}
