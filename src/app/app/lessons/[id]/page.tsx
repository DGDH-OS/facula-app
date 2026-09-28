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
        Eén ding staat hier voorop: de les downloaden. De titel vertelt welke
        les je voor je hebt, daaronder staat precies één hoofdknop en één
        zijweg ("Maak een nieuwe les"). Aanpassen en opnieuw maken zitten bij
        het onderdeel zelf, verderop op de pagina, waar ze thuishoren.
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

        <div className="mt-6 flex flex-col gap-3 border-t-2 border-lijn pt-6 sm:flex-row sm:items-start">
          <ExportPptxButton lessonId={rij.id} />
          <ButtonLink
            href="/app/lessons/new"
            variant="secondary"
            volleBreedte
            className="sm:w-auto"
          >
            Maak een nieuwe les
          </ButtonLink>
        </div>
      </header>

      <LessonSections lessonId={rij.id} onderdelen={output.onderdelen} />

      <VersionHistory lessonId={rij.id} />
    </div>
  );
}
