import { MAX_BOEK_BEGRIPPEN } from "@/lib/boek-begrippen";
import { MAX_EIGEN_VRAGEN } from "@/lib/voorbeeldtoets";
import { NextRequest, NextResponse } from "next/server";
import type { TestInput, Vak, Niveau } from "@/lib/types";
import { genereerToets } from "@/lib/test-generator";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { quotaBoodschap, saveWithQuota } from "@/lib/quota";
import { clampInt, limitString, readBodyWithLimit } from "@/lib/validation";

const VAKKEN: Vak[] = ["Maatschappijleer", "Geschiedenis", "Economie", "Aardrijkskunde"];
const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

function isVak(v: unknown): v is Vak {
  return typeof v === "string" && (VAKKEN as string[]).includes(v);
}

function isNiveau(v: unknown): v is Niveau {
  return typeof v === "string" && (NIVEAUS as string[]).includes(v);
}

/**
 * POST /api/tests
 * Genereert een toets via de ongewijzigde genereerToets()-functie en slaat
 * het resultaat op in facula.tests, gekoppeld aan de ingelogde gebruiker
 * (user_id altijd server-side uit de sessie, nooit uit de request-body).
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

  let body: Partial<TestInput>;
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

  const kernbegrippen =
    body.kernbegrippen === undefined ? "" : limitString(body.kernbegrippen, 2000);
  if (kernbegrippen === null) {
    return NextResponse.json(
      { error: "Kernbegrippen mogen maximaal 2000 tekens zijn." },
      { status: 400 }
    );
  }

  const boekBegrippen =
    body.boekBegrippen === undefined ? "" : limitString(body.boekBegrippen, MAX_BOEK_BEGRIPPEN);
  if (boekBegrippen === null) {
    return NextResponse.json(
      { error: "Begrippen uit het boek zijn te lang." },
      { status: 400 }
    );
  }

  const bronTekst = body.bronTekst === undefined ? "" : limitString(body.bronTekst, 12000);
  const bronVermelding =
    body.bronVermelding === undefined ? "" : limitString(body.bronVermelding, 300);
  if (bronTekst === null || bronVermelding === null) {
    return NextResponse.json({ error: "De bron is te lang." }, { status: 400 });
  }
  if (bronTekst && !bronVermelding) {
    return NextResponse.json(
      { error: "Vul de bronvermelding in (krant of site en datum)." },
      { status: 400 }
    );
  }

  const eigenVragen =
    body.eigenVragen === undefined ? "" : limitString(body.eigenVragen, MAX_EIGEN_VRAGEN);
  if (eigenVragen === null) {
    return NextResponse.json({ error: "De voorbeeldvragen zijn te lang." }, { status: 400 });
  }

  const aantalVragen =
    body.aantalVragen === undefined ? 8 : clampInt(body.aantalVragen, 1, 40);
  if (aantalVragen === null) {
    return NextResponse.json(
      { error: "Aantal vragen moet tussen 1 en 40 liggen." },
      { status: 400 }
    );
  }

  const input: TestInput = {
    vak: isVak(body.vak) ? body.vak : "Maatschappijleer",
    niveau: isNiveau(body.niveau) ? body.niveau : "havo",
    leerjaar: Number.isFinite(body.leerjaar) ? Number(body.leerjaar) : 4,
    leerdoel,
    kernbegrippen,
    aantalVragen,
    boekBegrippen,
    bronTekst,
    bronVermelding,
    eigenVragen,
  };

  try {
    // Eerst genereren, dan opslaan. Anders dan bij een les kost dat hier geen
    // AI-aanroep: genereerToets() is een lokale functie, dus een voorcheck op
    // het quotum zou niets uitsparen. De limiet valt in saveWithQuota(), dat
    // controleren, opslaan en tellen in één databasetransactie doet — zodat er
    // geen toets van het quotum af kan zonder dat de toets er ook echt staat.
    const toets = genereerToets(input);
    const output = {
      id: toets.id,
      createdAt: toets.createdAt,
      titel: toets.titel,
      bronnen: toets.bronnen,
      vragen: toets.vragen,
      totaalPunten: toets.totaalPunten,
      tijdsduur: toets.tijdsduur,
    };

    const opslag = await saveWithQuota(supabase, "tests", input, output);
    if (opslag.quotaExceeded) {
      return NextResponse.json(
        { error: quotaBoodschap("tests", opslag.regime, null) },
        { status: 402 }
      );
    }

    return NextResponse.json({ id: opslag.id, createdAt: opslag.createdAt, test: toets });
  } catch (err) {
    console.error("Toets genereren/opslaan mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van de toets." },
      { status: 500 }
    );
  }
}
