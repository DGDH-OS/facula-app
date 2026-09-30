import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ToetsWeergave } from "@/components/tests/ToetsWeergave";
import { ButtonLink } from "@/components/ui/Button";
import type { GeneratedTest } from "@/lib/types";

/**
 * Een eerder gemaakte toets terugzien en opnieuw downloaden.
 *
 * Deze pagina bestond nog niet, en daardoor was een toets na het wegklikken
 * alleen nog terug te maken (en kostte dat opnieuw quotum). Zelfde opzet als
 * de lespagina: RLS zorgt dat een docent alleen zijn eigen toets ziet, en we
 * filteren daarnaast expliciet op user_id als tweede laag.
 */
export default async function TestDetailPage({
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
    .from("tests")
    .select("id, input, output, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !rij) {
    notFound();
  }

  const toets: GeneratedTest = {
    id: rij.id,
    createdAt: rij.created_at,
    input: rij.input,
    titel: rij.output.titel,
    bronnen: rij.output.bronnen,
    vragen: rij.output.vragen,
    totaalPunten: rij.output.totaalPunten,
    tijdsduur: rij.output.tijdsduur,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/app"
        className="inline-flex min-h-14 items-center gap-2 text-base font-medium text-marine underline underline-offset-4"
      >
        <span aria-hidden>←</span>
        Terug naar start
      </Link>
      <h1 className="mt-1 font-display text-3xl text-marine">{toets.titel}</h1>

      <div className="mt-8">
        <ToetsWeergave
          toets={toets}
          extraActie={
            <ButtonLink href="/app/tests/new" variant="secondary">
              Nog een toets maken
            </ButtonLink>
          }
        />
      </div>
    </div>
  );
}
