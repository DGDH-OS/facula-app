import { NextRequest, NextResponse } from "next/server";
import type { TestInput, Vak, Niveau } from "@/lib/types";
import { genereerToets } from "@/lib/test-generator";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkAndIncrementUsage, isPaidSubscriber, quotaLimitBoodschap } from "@/lib/quota";

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

  let body: Partial<TestInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const leerdoel = typeof body.leerdoel === "string" ? body.leerdoel.trim() : "";
  if (!leerdoel) {
    return NextResponse.json({ error: "Leerdoel is verplicht." }, { status: 400 });
  }

  const input: TestInput = {
    vak: isVak(body.vak) ? body.vak : "Maatschappijleer",
    niveau: isNiveau(body.niveau) ? body.niveau : "havo",
    leerjaar: Number.isFinite(body.leerjaar) ? Number(body.leerjaar) : 4,
    leerdoel,
    kernbegrippen: typeof body.kernbegrippen === "string" ? body.kernbegrippen : "",
    aantalVragen: Number.isFinite(body.aantalVragen) ? Number(body.aantalVragen) : 8,
  };

  try {
    const paid = await isPaidSubscriber(supabase, user.id);
    if (!paid) {
      const usage = await checkAndIncrementUsage(supabase, user.id, "tests");
      if (!usage.allowed) {
        return NextResponse.json(
          { error: quotaLimitBoodschap("tests") },
          { status: 402 }
        );
      }
    }

    const toets = genereerToets(input);
    const output = {
      id: toets.id,
      createdAt: toets.createdAt,
      titel: toets.titel,
      vragen: toets.vragen,
      totaalPunten: toets.totaalPunten,
      tijdsduur: toets.tijdsduur,
    };

    const { data: rij, error } = await supabase
      .schema("facula")
      .from("tests")
      .insert({ user_id: user.id, input, output })
      .select("id, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: rij.id, createdAt: rij.created_at, test: toets });
  } catch (err) {
    console.error("Toets genereren/opslaan mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van de toets." },
      { status: 500 }
    );
  }
}
