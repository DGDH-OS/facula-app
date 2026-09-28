import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UpgradeButton } from "@/components/ui/UpgradeButton";
import { Tile } from "@/components/ui/Tile";
import { LesIcon, ToetsIcon, RapportIcon } from "@/components/ui/icons";
import { getCurrentUsage, isPaidSubscriber, FREE_QUOTA_PER_MONTH } from "@/lib/quota";
import type { GeneratedLesson } from "@/lib/types";

function tijdGeleden(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const dagen = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dagen <= 0) return "vandaag";
  if (dagen === 1) return "gisteren";
  if (dagen < 7) return `${dagen} dagen geleden`;
  const weken = Math.floor(dagen / 7);
  if (weken === 1) return "vorige week";
  return `${weken} weken geleden`;
}

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
      .limit(10),
    supabase
      .schema("facula")
      .from("tests")
      .select("id, input, output, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .schema("facula")
      .from("reports")
      .select("id, input, output, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const lessen = lessenRes.data ?? [];
  const toetsen = toetsenRes.data ?? [];
  const rapporten = rapportenRes.data ?? [];

  const paid = user ? await isPaidSubscriber(supabase, user.id) : false;
  const usage = user ? await getCurrentUsage(supabase, user.id) : { lessons: 0, tests: 0, reports: 0 };

  /*
   * Maximaal vijf rijen, en alleen lessen: een les heeft een detailpagina
   * (/app/lessons/[id]) en is dus echt te openen. Toetsen en rapporten
   * hebben die pagina nog niet, dus die staan als leesbare regel onder de
   * lijst in plaats van als rij die nergens heen gaat.
   */
  const laatsteLessen = lessen.slice(0, 5);
  const andersGemaakt = [
    toetsen.length > 0 ? `${toetsen.length} ${toetsen.length === 1 ? "toets" : "toetsen"}` : null,
    rapporten.length > 0
      ? `${rapporten.length} ${rapporten.length === 1 ? "rapport" : "rapporten"}`
      : null,
  ].filter((deel): deel is string => deel !== null);

  return (
    <div>
      <h1 className="font-display text-3xl text-marine">
        Welkom{user?.email ? `, ${user.email.split("@")[0]}` : ""}
      </h1>
      <p className="mt-3 max-w-[60ch] text-base text-tekst-zacht">
        Kies hieronder wat je wilt maken. Je hoeft alleen je leerdoel in te vullen.
      </p>

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
        {laatsteLessen.length === 0 ? (
          <p className="mt-4 text-base text-tekst-zacht">
            Je hebt nog niets gemaakt.{" "}
            <Link href="/app/lessons/new" className="text-marine underline underline-offset-4">
              Maak je eerste les
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-lijn overflow-hidden rounded-2xl border-2 border-lijn">
            {laatsteLessen.map((les) => {
              const input = les.input as GeneratedLesson["input"];
              const output = les.output as Pick<GeneratedLesson, "titel">;
              return (
                <li key={les.id}>
                  <Link
                    href={`/app/lessons/${les.id}`}
                    className="flex min-h-20 flex-col justify-center gap-1 bg-ivoor px-5 py-4 transition-colors duration-200 hover:bg-ivoor-deep sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                  >
                    <span className="text-lg font-semibold text-marine">{output.titel}</span>
                    <span className="text-base text-tekst-zacht">
                      Les · {input.vak} · {input.niveau} {input.leerjaar} ·{" "}
                      {tijdGeleden(les.created_at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {andersGemaakt.length > 0 && (
          <p className="mt-4 text-base text-tekst-zacht">
            Je maakte ook {andersGemaakt.join(" en ")}. Die kun je nu nog niet opnieuw openen, alleen
            nieuw maken.
          </p>
        )}
      </section>

      <section className="mt-14 rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-xl text-marine">Gebruik deze maand</h2>
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
                  uitleg={`Gratis: ${FREE_QUOTA_PER_MONTH} per soort per maand`}
                />
              )}
            </div>
            {paid ? (
              <p className="mt-3 text-base text-tekst-zacht">
                Je hebt een abonnement. Er is geen maandlimiet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-base text-tekst-zacht">
                <li>
                  {usage.lessons} van {FREE_QUOTA_PER_MONTH} lessen
                </li>
                <li>
                  {usage.tests} van {FREE_QUOTA_PER_MONTH} toetsen
                </li>
                <li>
                  {usage.reports} van {FREE_QUOTA_PER_MONTH} rapporten
                </li>
              </ul>
            )}
          </div>
          {!paid && <UpgradeButton />}
        </div>
      </section>
    </div>
  );
}

