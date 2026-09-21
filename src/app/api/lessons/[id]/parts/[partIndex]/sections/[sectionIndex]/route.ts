import { NextRequest, NextResponse } from "next/server";
import type { GeneratedLesson } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LessonOutput = Omit<GeneratedLesson, "input">;

/**
 * PATCH /api/lessons/[id]/parts/[partIndex]/sections/[sectionIndex]
 *
 * Slaat een handmatige docent-edit van een sectie op. Gaat BEWUST NIET door
 * afdwingenSlideRegels() — de docent bepaalt zelf de lengte van een
 * handmatige aanpassing, alleen automatisch gegenereerde content wordt aan
 * de content-dichtheidsregels gehouden.
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; partIndex: string; sectionIndex: string }> }
) {
  const { id, partIndex: partIndexRaw, sectionIndex: sectionIndexRaw } = await params;
  const partIndex = Number(partIndexRaw);
  const sectionIndex = Number(sectionIndexRaw);

  if (!Number.isInteger(partIndex) || !Number.isInteger(sectionIndex)) {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  let body: { inhoud?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const inhoud = Array.isArray(body.inhoud)
    ? body.inhoud
        .filter((regel): regel is string => typeof regel === "string")
        .map((regel) => regel.trim())
        .filter(Boolean)
    : [];

  if (inhoud.length === 0) {
    return NextResponse.json({ error: "Inhoud mag niet leeg zijn." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const { data: rij, error } = await supabase
    .schema("facula")
    .from("lessons")
    .select("id, output")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !rij) {
    return NextResponse.json({ error: "Les niet gevonden." }, { status: 404 });
  }

  const output = rij.output as LessonOutput;
  const deel = output.onderdelen[partIndex];
  const sectie = deel?.secties[sectionIndex];

  if (!deel || !sectie) {
    return NextResponse.json({ error: "Sectie niet gevonden." }, { status: 404 });
  }

  output.onderdelen[partIndex].secties[sectionIndex] = { ...sectie, inhoud };

  const { error: updateError } = await supabase
    .schema("facula")
    .from("lessons")
    .update({ output })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Sectie-edit opslaan mislukt", updateError);
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  }

  return NextResponse.json({ inhoud, lesson: output });
}
