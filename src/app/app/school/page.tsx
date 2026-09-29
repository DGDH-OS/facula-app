import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { haalLidmaatschap, ROL_LABEL, type SchoolRol } from "@/lib/school";
import { PageHeader } from "@/components/ui/PageHeader";
import { SchoolBeheerWeergave } from "@/components/school/SchoolBeheerWeergave";
import type { SectieRij } from "@/components/school/SectiesBeheer";
import type { LidRij, UitnodigingRij } from "@/components/school/DocentenBeheer";
import type { Lettertype, PresetNaam } from "@/lib/huisstijl/themes";

/**
 * Het beheerpaneel van een school: hier worden de gegevens opgehaald, het
 * scherm zelf staat in SchoolBeheerWeergave.
 *
 * Alleen voor de beheerder. Een gewone docent van dezelfde school krijgt geen
 * 404 maar een uitleg: hij weet dat zijn school bestaat, dus doen alsof de
 * pagina niet bestaat is alleen verwarrend. Wie bij geen school hoort, krijgt
 * wél een 404: voor hem bestaat dit scherm echt niet.
 *
 * Alle gegevens komen langs RLS binnen, plus facula.school_usage_overzicht()
 * voor de ledenlijst met verbruik (definer, want het e-mailadres van een lid
 * staat in auth.users en dat is voor authenticated niet leesbaar). Die functie
 * weigert zelf als de aanvrager geen beheerder is, dus de controle hieronder is
 * de tweede laag en niet de enige.
 */
export default async function SchoolBeheerPage() {
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

  if (lid.rol !== "beheerder") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          titel="Beheer van de school"
          uitleg={
            "Deze pagina is voor de beheerder van " +
            lid.schoolNaam +
            ". Jij werkt hier als " +
            ROL_LABEL[lid.rol].toLowerCase() +
            ". Wil je iets laten wijzigen aan secties, docenten of de huisstijl, vraag het dan aan je beheerder."
          }
        />
      </div>
    );
  }

  const [schoolRes, sectiesRes, ledenRes, uitnodigingenRes, delingenRes] = await Promise.all([
    supabase
      .schema("facula")
      .from("schools")
      .select(
        "id, name, plan, pilot_ends_at, seat_limit, quota_mode, monthly_pool, huisstijl_preset, accent, tekst, achtergrond, lettertype, logo_path, enforce_huisstijl"
      )
      .eq("id", lid.schoolId)
      .maybeSingle(),
    supabase
      .schema("facula")
      .from("sections")
      .select("id, naam")
      .order("naam", { ascending: true }),
    supabase.schema("facula").rpc("school_usage_overzicht"),
    supabase
      .schema("facula")
      .from("school_invites")
      .select("id, email, role, expires_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
    supabase.schema("facula").from("section_shares").select("id, section_id"),
  ]);

  const school = schoolRes.data;
  if (!school) {
    notFound();
  }

  const ledenRuw = (ledenRes.data ?? []) as {
    user_id: string;
    email: string | null;
    role: string;
    status: string;
    section_id: string | null;
    section_naam: string | null;
    lessons_generated: number;
    tests_generated: number;
    reports_generated: number;
  }[];

  const leden: LidRij[] = ledenRuw.map((rij) => ({
    userId: rij.user_id,
    email: rij.email ?? "(onbekend adres)",
    rol: rij.role as SchoolRol,
    status: rij.status,
    sectieId: rij.section_id,
    sectieNaam: rij.section_naam,
    lessen: rij.lessons_generated ?? 0,
    toetsen: rij.tests_generated ?? 0,
    rapporten: rij.reports_generated ?? 0,
  }));

  const delingen = (delingenRes.data ?? []) as { id: string; section_id: string }[];

  const secties: SectieRij[] = (sectiesRes.data ?? []).map((sectie) => ({
    id: sectie.id as string,
    naam: sectie.naam as string,
    aantalDocenten: leden.filter((l) => l.sectieId === sectie.id && l.status === "active")
      .length,
    aantalGedeeld: delingen.filter((d) => d.section_id === sectie.id).length,
  }));

  const uitnodigingen: UitnodigingRij[] = (uitnodigingenRes.data ?? []).map((rij) => ({
    id: rij.id as string,
    email: rij.email as string,
    rol: rij.role as SchoolRol,
    verlooptOp: rij.expires_at as string,
  }));

  const actieveLeden = leden.filter((l) => l.status === "active").length;

  // Het schoolbrede verbruik van deze maand, opgeteld uit dezelfde cijfers die
  // per docent in de lijst staan. Eén bron, dus de totalen kunnen niet afwijken
  // van de regels eronder.
  const totaal = leden.reduce(
    (som, l) => ({
      lessen: som.lessen + l.lessen,
      toetsen: som.toetsen + l.toetsen,
      rapporten: som.rapporten + l.rapporten,
    }),
    { lessen: 0, toetsen: 0, rapporten: 0 }
  );

  return (
    <SchoolBeheerWeergave
      mijnUserId={user.id}
      schoolNaam={school.name as string}
      plan={lid.plan}
      pilotTot={school.pilot_ends_at as string | null}
      seatLimit={school.seat_limit as number}
      actieveLeden={actieveLeden}
      plekkenVrij={Math.max((school.seat_limit as number) - actieveLeden, 0)}
      totaal={totaal}
      poolLimiet={
        school.quota_mode === "pool" ? ((school.monthly_pool as number | null) ?? null) : null
      }
      leden={leden}
      secties={secties}
      uitnodigingen={uitnodigingen}
      huisstijl={{
        preset: school.huisstijl_preset as PresetNaam,
        accent: school.accent as string,
        tekst: school.tekst as string,
        achtergrond: school.achtergrond as string,
        lettertype: school.lettertype as Lettertype,
        afdwingen: school.enforce_huisstijl === true,
        heeftLogo: Boolean(school.logo_path),
      }}
    />
  );
}
