import { NextRequest, NextResponse } from "next/server";
import type { GeneratedLesson } from "@/lib/types";
import {
  bouwCasus,
  bouwUitgewerktVoorbeeld,
  bouwTerugblik,
  bouwBegeleideInoefening,
  bouwOpdracht,
  bouwBespreken,
  bouwHuiswerk,
  bouwLeerdoelKernbegrippen,
} from "@/lib/lesson-generator";
import { afdwingenSlideRegels } from "@/lib/slide-content-rules";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LessonOutput = Omit<GeneratedLesson, "input">;

/**
 * POST /api/lessons/[id]/parts/[partIndex]/sections/[sectionIndex]/regenerate
 *
 * Regenereert de inhoud van ÉÉN sectie met dezelfde bouwfunctie/content-
 * regels als genereerLes(), op basis van de opgeslagen input/output — niet
 * met een nieuw willekeurig leerdoel. Context voor de groepstoewijzing wordt
 * pragmatisch vereenvoudigd: i.p.v. de exacte per-les-begrippengroep te
 * reconstrueren wordt de VOLLEDIGE kernbegrippenlijst van de les gebruikt.
 * Precisie op groepstoewijzing is minder belangrijk dan dat de content door
 * dezelfde regels (afdwingenSlideRegels/afdwingenDefinitie) heen gaat.
 */
export async function POST(
  _request: NextRequest,
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

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  // Behalve op RLS vertrouwen ook expliciet filteren op user_id: een
  // verdedigingslaag zodat deze query nooit een rij van iemand anders
  // teruggeeft, zelfs als RLS ooit per ongeluk zou uitstaan.
  const { data: rij, error } = await supabase
    .schema("facula")
    .from("lessons")
    .select("id, input, output")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !rij) {
    return NextResponse.json({ error: "Les niet gevonden." }, { status: 404 });
  }

  const input = rij.input as GeneratedLesson["input"];
  const output = rij.output as LessonOutput;
  const deel = output.onderdelen[partIndex];
  const sectie = deel?.secties[sectionIndex];

  if (!deel || !sectie) {
    return NextResponse.json({ error: "Sectie niet gevonden." }, { status: 404 });
  }

  const groep = output.kernbegrippen.length > 0 ? output.kernbegrippen : ["kernbegrip"];
  const isEersteLes = partIndex === 0;
  const isLaatsteLes = partIndex === output.onderdelen.length - 1;

  let nieuweInhoud: string[];
  switch (sectionIndex) {
    case 0:
      nieuweInhoud = bouwTerugblik(input.vak, groep, isEersteLes);
      break;
    case 1:
      nieuweInhoud = bouwLeerdoelKernbegrippen(input.vak, groep, isEersteLes);
      break;
    case 2:
      nieuweInhoud = bouwCasus(input.vak, groep, input.niveau);
      break;
    case 3:
      nieuweInhoud = bouwUitgewerktVoorbeeld(input.vak, groep);
      break;
    case 4:
      nieuweInhoud = bouwBegeleideInoefening(input.vak, groep);
      break;
    case 5:
      nieuweInhoud = bouwOpdracht(groep);
      break;
    case 6:
      nieuweInhoud = bouwBespreken();
      break;
    case 7:
      nieuweInhoud = isLaatsteLes
        ? afdwingenSlideRegels([
            ...bouwHuiswerk(input.vak, groep),
            "Vooruitblik: toets sluit aan op leerdoelen",
          ])
        : bouwHuiswerk(input.vak, groep);
      break;
    default:
      return NextResponse.json({ error: "Onbekende sectie." }, { status: 400 });
  }

  output.onderdelen[partIndex].secties[sectionIndex] = {
    ...sectie,
    inhoud: nieuweInhoud,
  };

  const { error: updateError } = await supabase
    .schema("facula")
    .from("lessons")
    .update({ output })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Sectie-regeneratie opslaan mislukt", updateError);
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  }

  return NextResponse.json({ inhoud: nieuweInhoud, lesson: output });
}
