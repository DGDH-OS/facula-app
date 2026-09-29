import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RapportWeergave } from "@/components/reports/RapportWeergave";
import { ButtonLink } from "@/components/ui/Button";
import type { GeneratedReport } from "@/lib/types";
import { normaliseerRapportGuardrail } from "@/lib/report-compat";

/**
 * Een eerder geschreven rapporttekst terugzien, kopiëren of downloaden.
 *
 * Zelfde opzet als de les- en toetspagina. Let op het verschil in
 * gevoeligheid: in de invoer van een rapport staat een leerling-label plus
 * aantekeningen. Die staan al in facula.reports en zijn door RLS afgeschermd
 * tot de eigen docent; deze pagina laat er niets meer van zien dan wat die
 * docent zelf heeft ingevuld, en de URL bevat alleen een id.
 */
export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: rij, error } = await supabase
    .schema("facula")
    .from("reports")
    .select("id, input, output, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !rij) {
    notFound();
  }

  const rapport: GeneratedReport = {
    id: rij.id,
    createdAt: rij.created_at,
    input: rij.input,
    tekst: rij.output.tekst,
    guardrail: normaliseerRapportGuardrail(rij.output?.guardrail),
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/app"
        className="inline-flex min-h-14 items-center gap-2 text-base font-medium text-marine underline underline-offset-4"
      >
        <span aria-hidden>←</span>
        Terug naar start
      </Link>
      <h1 className="mt-1 font-display text-3xl text-marine">Je tekst</h1>

      <div className="mt-8">
        <RapportWeergave
          rapport={rapport}
          extraActie={
            <ButtonLink href="/app/reports/new" variant="secondary">
              Nog een tekst schrijven
            </ButtonLink>
          }
        />
      </div>
    </div>
  );
}
