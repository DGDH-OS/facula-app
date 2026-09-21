import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ExportPptxButton } from "@/components/lessons/ExportPptxButton";
import { LessonSections } from "@/components/lessons/LessonSections";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-marine)]">{output.titel}</h1>
          <p className="mt-2 text-sm text-[var(--color-inkt)]/60">
            {input.vak} · {input.niveau} {input.leerjaar}
          </p>
          {output.kernbegrippen.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {output.kernbegrippen.map((begrip) => (
                <span
                  key={begrip}
                  className="rounded-full bg-[var(--color-goud)]/15 px-3 py-1 text-xs font-medium text-[var(--color-goud)]"
                >
                  {begrip}
                </span>
              ))}
            </div>
          )}
        </div>
        <ExportPptxButton lessonId={rij.id} />
      </div>

      <LessonSections lessonId={rij.id} onderdelen={output.onderdelen} />
    </div>
  );
}
