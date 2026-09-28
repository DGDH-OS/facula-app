import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ExportPptxButton } from "@/components/lessons/ExportPptxButton";
import { LessonSections } from "@/components/lessons/LessonSections";
import { VersionHistory } from "@/components/lessons/VersionHistory";
import { ButtonLink } from "@/components/ui/Button";
import type { GeneratedLesson } from "@/lib/types";

export default async function LessonDetailPage({
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

  // RLS zorgt al dat een gebruiker alleen zijn eigen les ziet, maar we
  // filteren ook hier expliciet op user_id als verdedigingslaag. Geen rij
  // (niet bestaand, of van een andere user) -> nette 404, niet crashen.
  const { data: rij, error } = await supabase
    .schema("facula")
    .from("lessons")
    .select("id, input, output, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !rij) {
    notFound();
  }

  const input = rij.input as GeneratedLesson["input"];
  const output = rij.output as Omit<GeneratedLesson, "input">;

  return (
    <div className="mx-auto max-w-3xl">
      {/*
        Eén ding staat hier voorop: de les downloaden (brief 10.8). Daarnaast
        twee secundaire wegen terug naar de wizard, mét de invoer van deze les:
        "Pas aan" opent stap 1 om iets te veranderen, "Maak opnieuw" springt
        naar het overzicht in stap 2. Geen van beide genereert uit zichzelf:
        de docent drukt zelf op "Maak de les". Aanpassen per onderdeel zit
        verderop op de pagina, bij het onderdeel zelf.
      */}
      <header>
        <h1 className="max-w-[70ch] font-display text-3xl text-marine">
          {output.titel}
        </h1>
        <p className="mt-2 text-base text-tekst-zacht">
          {input.vak} · {input.niveau} {input.leerjaar}
        </p>
        {output.kernbegrippen.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {output.kernbegrippen.map((begrip) => (
              /* Kernbegrippen zijn geen status: neutraal vlak met
                 --color-tekst erop (11,78:1), geen goud-op-goud. */
              <span
                key={begrip}
                className="rounded-full bg-neutraal-vlak px-3 py-1 text-base font-semibold text-tekst"
              >
                {begrip}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t-2 border-lijn pt-6 sm:flex-row sm:flex-wrap sm:items-start">
          <ExportPptxButton lessonId={rij.id} />
          <ButtonLink
            href={`/app/lessons/new?van=${rij.id}`}
            variant="secondary"
            volleBreedte
            className="sm:w-auto"
          >
            Pas aan
          </ButtonLink>
          <ButtonLink
            href={`/app/lessons/new?van=${rij.id}&stap=2`}
            variant="secondary"
            volleBreedte
            className="sm:w-auto"
          >
            Maak opnieuw
          </ButtonLink>
        </div>

        <p className="mt-4 text-base text-tekst">
          <Link
            href="/app/lessons/new"
            className="font-semibold text-marine underline underline-offset-4"
          >
            Maak een nieuwe les
          </Link>{" "}
          met een ander leerdoel.
        </p>
      </header>

      <LessonSections lessonId={rij.id} onderdelen={output.onderdelen} />

      <VersionHistory lessonId={rij.id} />
    </div>
  );
}
