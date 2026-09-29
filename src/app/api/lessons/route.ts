import { NextRequest, NextResponse } from "next/server";
import type { LessonInput, Vak, Niveau, GeneratedLesson } from "@/lib/types";
import { genereerLesMetAi } from "@/lib/ai/generate-lesson";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { quotaBoodschap, saveWithQuota } from "@/lib/quota";
import { haalVerbruik } from "@/lib/school";
import { clampInt, limitString, readBodyWithLimit } from "@/lib/validation";

/**
 * Een AI-les kost ongeveer 22 seconden, en bij een terugval op het tweede
 * model ongeveer 50 seconden meer. 180 s geeft de keten in generate-lesson.ts
 * (budget 130 s) ruimte om daarna nog de sjabloon-fallback af te maken. Dit is
 * een bovengrens en geen verwachting: bijna elke aanvraag is binnen een halve
 * minuut klaar.
 */
export const maxDuration = 180;

const VAKKEN: Vak[] = ["Maatschappijleer", "Geschiedenis", "Economie", "Aardrijkskunde"];
const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

function isVak(v: unknown): v is Vak {
  return typeof v === "string" && (VAKKEN as string[]).includes(v);
}

function isNiveau(v: unknown): v is Niveau {
  return typeof v === "string" && (NIVEAUS as string[]).includes(v);
}

/**
 * POST /api/lessons
 * Genereert een les via de modelketen in src/lib/ai/generate-lesson.ts
 * (Vertex AI, met de sjabloongenerator als laatste redmiddel) en slaat het
 * resultaat op in facula.lessons, gekoppeld aan de ingelogde gebruiker.
 * De user_id komt ALTIJD uit de server-side sessie, nooit uit de request-
 * body — een client kan dus nooit voor iemand anders opslaan.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const bodyResult = await readBodyWithLimit(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: "Aanvraag is te groot." }, { status: 413 });
  }

  let body: Partial<LessonInput>;
  try {
    body = JSON.parse(bodyResult.text);
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const leerdoel = limitString(body.leerdoel, 2000);
  if (!leerdoel) {
    return NextResponse.json(
      { error: "Leerdoel is verplicht en mag maximaal 2000 tekens zijn." },
      { status: 400 }
    );
  }

  const lesduur =
    body.lesduur === undefined ? 50 : clampInt(body.lesduur, 10, 240);
  if (lesduur === null) {
    return NextResponse.json(
      { error: "Lesduur moet tussen 10 en 240 minuten liggen." },
      { status: 400 }
    );
  }

  const aantalLessen =
    body.aantalLessen === undefined ? 1 : clampInt(body.aantalLessen, 1, 6);
  if (aantalLessen === null) {
    return NextResponse.json(
      { error: "Aantal lessen moet tussen 1 en 6 liggen." },
      { status: 400 }
    );
  }

  const input: LessonInput = {
    vak: isVak(body.vak) ? body.vak : "Maatschappijleer",
    niveau: isNiveau(body.niveau) ? body.niveau : "havo",
    leerjaar: Number.isFinite(body.leerjaar) ? Number(body.leerjaar) : 4,
    leerdoel,
    lesduur,
    aantalLessen,
  };

  // Het quotum kost de docent pas iets als er ook echt een les is opgeslagen.
  // Daarom twee stappen:
  //   1. een goedkope leescheck vóór de AI-aanroep — wie al over de limiet is,
  //      hoort geen modelaanroep te kosten. Deze check hoogt niets op en is
  //      bewust niet bindend;
  //   2. saveWithQuota(): limiet controleren, opslaan en de teller ophogen in
  //      één databasetransactie. Alleen die is bestand tegen twee
  //      gelijktijdige aanvragen door dezelfde laatste vrije plek, en er kan
  //      geen les van het quotum af zonder dat de les er ook echt staat.
  //
  // De voorcheck leest facula.mijn_verbruik(), dat zelf bepaalt welk regime
  // geldt (schoollicentie, abonnement, gratis). Zo staat die keuze op één plek:
  // in de database, dezelfde plek waar de bindende beslissing valt. Een
  // eigen navolging hier zou bij de eerste wijziging uit elkaar lopen.
  try {
    const verbruik = await haalVerbruik(supabase);
    if (verbruik.limiet !== null && verbruik.lessons >= verbruik.limiet) {
      return NextResponse.json(
        { error: quotaBoodschap("lessons", verbruik.regime, verbruik.limiet) },
        { status: 402 }
      );
    }

    const { les, pogingen } = await genereerLesMetAi(input);
    // Welke schakel de les schreef, hoort in de serverlog: zonder dit is niet
    // te zien of productie stil op de sjabloongenerator is teruggevallen.
    console.info("Les gegenereerd", { bron: les.bron, pogingen });

    const output: Omit<GeneratedLesson, "input"> = {
      id: les.id,
      createdAt: les.createdAt,
      titel: les.titel,
      kernbegrippen: les.kernbegrippen,
      onderdelen: les.onderdelen,
      ...(les.leerdoelen ? { leerdoelen: les.leerdoelen } : {}),
      ...(les.bron ? { bron: les.bron } : {}),
      ...(les.model ? { model: les.model } : {}),
    };

    const opslag = await saveWithQuota(supabase, "lessons", input, output);
    if (opslag.quotaExceeded) {
      // De melding komt uit het regime dat de database net zelf vaststelde,
      // niet uit een tweede gok hier.
      return NextResponse.json(
        { error: quotaBoodschap("lessons", opslag.regime, null) },
        { status: 402 }
      );
    }

    return NextResponse.json({ id: opslag.id, createdAt: opslag.createdAt, lesson: les });
  } catch (err) {
    console.error("Les genereren/opslaan mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van de les." },
      { status: 500 }
    );
  }
}
