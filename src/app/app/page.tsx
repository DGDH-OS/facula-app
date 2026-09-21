import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { GeneratedLesson, GeneratedTest, GeneratedReport } from "@/lib/types";

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

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl text-[var(--color-marine)]">
          Welkom{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/app/lessons/new"
          className="group rounded-2xl bg-[var(--color-marine)] p-6 text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
        >
          <p className="font-display text-xl">Lessen maken</p>
          <p className="mt-3 text-sm text-[var(--color-ivoor)]/70">
            {lessen.length} {lessen.length === 1 ? "les" : "lessen"}
          </p>
        </Link>
        <Link
          href="/app/tests/new"
          className="group rounded-2xl border-2 border-[var(--color-marine)]/30 p-6 transition hover:border-[var(--color-marine)]"
        >
          <p className="font-display text-xl text-[var(--color-marine)]">Toetsen maken</p>
          <p className="mt-3 text-sm text-[var(--color-inkt)]/60">
            {toetsen.length} {toetsen.length === 1 ? "toets" : "toetsen"}
          </p>
        </Link>
        <Link
          href="/app/reports/new"
          className="group rounded-2xl border-2 border-[var(--color-goud)]/50 p-6 transition hover:border-[var(--color-goud)]"
        >
          <div className="flex items-center gap-2">
            <p className="font-display text-xl text-[var(--color-marine)]">Rapporten schrijven</p>
            <StatusBadge label="AVG" tone="warning" title="Bevat mogelijk leerlinggegevens — AVG-let-op" />
          </div>
          <p className="mt-3 text-sm text-[var(--color-inkt)]/60">Oudercommunicatie</p>
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl text-[var(--color-marine)]">Recente lessen</h2>
        {lessen.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-inkt)]/60">
            Nog geen lessen. <Link href="/app/lessons/new" className="underline underline-offset-4">Maak je eerste les</Link>.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-lijn)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-ivoor-deep)] text-xs uppercase tracking-wide text-[var(--color-inkt)]/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Titel</th>
                  <th className="px-5 py-3 font-medium">Vak</th>
                  <th className="px-5 py-3 font-medium">Niveau</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Bijgewerkt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-lijn)]">
                {lessen.map((les) => {
                  const input = les.input as GeneratedLesson["input"];
                  const output = les.output as Pick<GeneratedLesson, "titel">;
                  return (
                    <tr key={les.id} className="bg-[var(--color-ivoor)]">
                      <td className="px-5 py-3 font-medium text-[var(--color-marine)]">{output.titel}</td>
                      <td className="px-5 py-3 text-[var(--color-inkt)]/75">{input.vak}</td>
                      <td className="px-5 py-3 text-[var(--color-inkt)]/75">
                        {input.niveau} {input.leerjaar}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge label="Klaar" tone="success" />
                      </td>
                      <td className="px-5 py-3 text-[var(--color-inkt)]/50">{tijdGeleden(les.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl text-[var(--color-marine)]">Recente toetsen</h2>
        {toetsen.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-inkt)]/60">
            Nog geen toetsen. <Link href="/app/tests/new" className="underline underline-offset-4">Maak je eerste toets</Link>.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-lijn)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-ivoor-deep)] text-xs uppercase tracking-wide text-[var(--color-inkt)]/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Titel</th>
                  <th className="px-5 py-3 font-medium">Vak</th>
                  <th className="px-5 py-3 font-medium">Niveau</th>
                  <th className="px-5 py-3 font-medium">Vragen</th>
                  <th className="px-5 py-3 font-medium">Bijgewerkt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-lijn)]">
                {toetsen.map((toets) => {
                  const input = toets.input as GeneratedTest["input"];
                  const output = toets.output as Pick<GeneratedTest, "titel" | "vragen">;
                  return (
                    <tr key={toets.id} className="bg-[var(--color-ivoor)]">
                      <td className="px-5 py-3 font-medium text-[var(--color-marine)]">{output.titel}</td>
                      <td className="px-5 py-3 text-[var(--color-inkt)]/75">{input.vak}</td>
                      <td className="px-5 py-3 text-[var(--color-inkt)]/75">
                        {input.niveau} {input.leerjaar}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-inkt)]/75">{output.vragen.length}</td>
                      <td className="px-5 py-3 text-[var(--color-inkt)]/50">{tijdGeleden(toets.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl text-[var(--color-marine)]">Rapport &amp; communicatie</h2>
          <StatusBadge label="AVG" tone="warning" title="Bevat mogelijk leerlinggegevens — AVG-let-op" />
        </div>
        <div className="mt-4 rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6">
          {rapporten.length === 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--color-inkt)]/75">Nog geen rapportteksten.</p>
              <div className="flex gap-3">
                <Link
                  href="/app/reports/new"
                  className="rounded-full bg-[var(--color-marine)] px-5 py-2.5 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
                >
                  Nieuw rapport
                </Link>
                <Link
                  href="/privacy/rapport-module"
                  className="rounded-full border border-[var(--color-marine)]/30 px-5 py-2.5 text-sm font-medium text-[var(--color-marine)] transition hover:bg-[var(--color-marine)]/5"
                >
                  Privacy-uitleg
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <ul className="space-y-3">
                {rapporten.map((rapport) => {
                  const input = rapport.input as GeneratedReport["input"];
                  return (
                    <li key={rapport.id} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-inkt)]/80">
                        {input.leerlingLabel} · {input.outputType}
                      </span>
                      <span className="text-[var(--color-inkt)]/50">{tijdGeleden(rapport.created_at)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/app/reports/new"
                  className="rounded-full bg-[var(--color-marine)] px-5 py-2.5 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
                >
                  Nieuw rapport
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
