import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { haalLidmaatschap, PLAN_LABEL, ROL_LABEL } from "@/lib/school";
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
import type { SchoolRol } from "@/lib/school";
import type { Lettertype, PresetNaam } from "@/lib/huisstijl/themes";

/**
 * Het beheerpaneel van een school.
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
  const plekkenVrij = Math.max((school.seat_limit as number) - actieveLeden, 0);

  // Het schoolbrede verbruik van deze maand, bij elkaar opgeteld uit dezelfde
  // cijfers die per docent in de lijst staan. Eén bron, dus de totalen kunnen
  // niet afwijken van de regels eronder.
  const totaal = leden.reduce(
    (som, l) => ({
      lessen: som.lessen + l.lessen,
      toetsen: som.toetsen + l.toetsen,
      rapporten: som.rapporten + l.rapporten,
    }),
    { lessen: 0, toetsen: 0, rapporten: 0 }
  );

  const poolLimiet =
    school.quota_mode === "pool" ? ((school.monthly_pool as number | null) ?? null) : null;

  const pilotTot = school.pilot_ends_at as string | null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titel={school.name as string}
        uitleg="Hier regel je de docenten, de secties en de huisstijl van je school. Je ziet hoeveel er gemaakt wordt, nooit wat erin staat."
        status={
          <StatusBadge
            label={PLAN_LABEL[lid.plan]}
            tone={lid.plan === "gepauzeerd" ? "warning" : "success"}
            uitleg={
              pilotTot
                ? "Pilot tot " + new Date(pilotTot).toLocaleDateString("nl-NL")
                : "De licentie van deze school"
            }
          />
        }
      />

      <div className="mt-8 space-y-8">
        <Section
          titel="Docentplekken"
          uitleg={
            pilotTot
              ? "De pilot loopt tot " +
                new Date(pilotTot).toLocaleDateString("nl-NL") +
                ". Meer plekken of een langere pilot? Neem contact met ons op."
              : "Meer docentplekken nodig? Neem contact met ons op, dan zetten wij ze bij."
          }
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <UsageMeter
              label="Plekken in gebruik"
              gebruikt={actieveLeden}
              limiet={school.seat_limit as number}
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
            mijnUserId={user.id}
            leden={leden}
            secties={secties.map((s) => ({ id: s.id, naam: s.naam }))}
            uitnodigingen={uitnodigingen}
            plekkenVrij={plekkenVrij}
          />
        </Section>

        <Section
          titel="Secties"
          uitleg="Een sectie is de groep waarmee een docent materiaal kan delen. Meestal een vak, soms een team."
        >
          <SectiesBeheer secties={secties} />
        </Section>

        <Section
          titel="Huisstijl van de school"
          uitleg="Kleuren, lettertype en logo voor alles wat je docenten downloaden."
        >
          <SchoolInstellingen
            naam={school.name as string}
            preset={school.huisstijl_preset as PresetNaam}
            accent={school.accent as string}
            tekst={school.tekst as string}
            achtergrond={school.achtergrond as string}
            lettertype={school.lettertype as Lettertype}
            afdwingen={school.enforce_huisstijl === true}
            heeftLogo={Boolean(school.logo_path)}
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
