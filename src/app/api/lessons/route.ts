import { NextRequest, NextResponse } from "next/server";
import type { LessonInput, Vak, Niveau, GeneratedLesson } from "@/lib/types";
import { genereerLes } from "@/lib/lesson-generator";
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
 * POST /api/lessons
 * Genereert een les via de ongewijzigde genereerLes()-functie en slaat het
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

  let body: Partial<LessonInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const leerdoel = typeof body.leerdoel === "string" ? body.leerdoel.trim() : "";
  if (!leerdoel) {
    return NextResponse.json({ error: "Leerdoel is verplicht." }, { status: 400 });
  }

  const input: LessonInput = {
    vak: isVak(body.vak) ? body.vak : "Maatschappijleer",
    niveau: isNiveau(body.niveau) ? body.niveau : "havo",
    leerjaar: Number.isFinite(body.leerjaar) ? Number(body.leerjaar) : 4,
    leerdoel,
    lesduur: Number.isFinite(body.lesduur) ? Number(body.lesduur) : 50,
    aantalLessen: Number.isFinite(body.aantalLessen) ? Number(body.aantalLessen) : 1,
  };

  try {
    const paid = await isPaidSubscriber(supabase, user.id);
    if (!paid) {
      const usage = await checkAndIncrementUsage(supabase, user.id, "lessons");
      if (!usage.allowed) {
        return NextResponse.json(
          { error: quotaLimitBoodschap("lessons") },
          { status: 402 }
        );
      }
    }

    const les = genereerLes(input);
    const output: Omit<GeneratedLesson, "input"> = {
      id: les.id,
      createdAt: les.createdAt,
      titel: les.titel,
      kernbegrippen: les.kernbegrippen,
      onderdelen: les.onderdelen,
    };

    const { data: rij, error } = await supabase
      .schema("facula")
      .from("lessons")
      .insert({ user_id: user.id, input, output })
      .select("id, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: rij.id, createdAt: rij.created_at, lesson: les });
  } catch (err) {
    console.error("Les genereren/opslaan mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van de les." },
      { status: 500 }
    );
  }
}
