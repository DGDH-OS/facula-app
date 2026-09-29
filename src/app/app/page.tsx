import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UpgradeButton } from "@/components/ui/UpgradeButton";
import { Tile } from "@/components/ui/Tile";
import { EmptyState, PageHeader, Section } from "@/components/ui/PageHeader";
import { UsageMeter } from "@/components/ui/UsageMeter";
import { ButtonLink } from "@/components/ui/Button";
import { LesIcon, ToetsIcon, RapportIcon } from "@/components/ui/icons";
import { RecenteLijst, type RecentItem } from "@/components/app/RecenteLijst";
import { getCurrentUsage, isPaidSubscriber, FREE_QUOTA_PER_MONTH } from "@/lib/quota";
import type { GeneratedLesson, GeneratedTest, ReportInput } from "@/lib/types";

/** Hoeveel items er onder "Je laatste werk" passen zonder een lijst te worden. */
const MAX_RECENT = 6;

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

  const paid = user ? await isPaidSubscriber(supabase, user.id) : false;
  const usage = user
    ? await getCurrentUsage(supabase, user.id)
    : { lessons: 0, tests: 0, reports: 0 };

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
    <div>
      <PageHeader
        titel={voornaam ? "Welkom, " + voornaam : "Welkom"}
        uitleg="Kies hieronder wat je wilt maken. Je hoeft alleen je leerdoel in te vullen."
      />

      <h2 className="mt-10 font-display text-2xl text-marine">Wat wil je maken?</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
        actie={paid ? undefined : <UpgradeButton />}
      >
        <div className="flex flex-wrap items-center gap-3">
          {paid ? (
            <StatusBadge
              label="Abonnee"
              tone="success"
              uitleg="Onbeperkt gebruik als betalend abonnee"
            />
          ) : (
            <StatusBadge
              label="Gratis"
              tone="neutral"
              uitleg={"Gratis: " + FREE_QUOTA_PER_MONTH + " per soort per maand"}
            />
          )}
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          <UsageMeter
            label="Lessen"
            gebruikt={usage.lessons}
            limiet={paid ? null : FREE_QUOTA_PER_MONTH}
          />
          <UsageMeter
            label="Toetsen"
            gebruikt={usage.tests}
            limiet={paid ? null : FREE_QUOTA_PER_MONTH}
          />
          <UsageMeter
            label="Rapportteksten"
            gebruikt={usage.reports}
            limiet={paid ? null : FREE_QUOTA_PER_MONTH}
          />
        </div>
      </Section>
    </div>
  );
}
