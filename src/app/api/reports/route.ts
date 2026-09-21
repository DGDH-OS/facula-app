import { NextRequest, NextResponse } from "next/server";
import type { ReportInput, RapportOutputType, RapportToon } from "@/lib/types";
import { genereerRapportTekst } from "@/lib/report-generator";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const OUTPUT_TYPES: RapportOutputType[] = ["rapporttekst", "oudergesprek", "oudermail"];
const TONEN: RapportToon[] = ["formeel", "vriendelijk-direct", "warm"];

function isOutputType(v: unknown): v is RapportOutputType {
  return typeof v === "string" && (OUTPUT_TYPES as string[]).includes(v);
}

function isToon(v: unknown): v is RapportToon {
  return typeof v === "string" && (TONEN as string[]).includes(v);
}

/**
 * POST /api/reports
 * Genereert een rapporttekst via de ongewijzigde genereerRapportTekst()-
 * functie (incl. AVG-guardrail) en slaat het resultaat op in
 * facula.reports, gekoppeld aan de ingelogde gebruiker.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  let body: Partial<ReportInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const leerlingLabel =
    typeof body.leerlingLabel === "string" ? body.leerlingLabel.trim() : "";
  const aantekeningen =
    typeof body.aantekeningen === "string" ? body.aantekeningen.trim() : "";

  if (!leerlingLabel || !aantekeningen) {
    return NextResponse.json(
      { error: "Leerling en aantekeningen zijn verplicht." },
      { status: 400 }
    );
  }

  const input: ReportInput = {
    leerlingLabel,
    aantekeningen,
    outputType: isOutputType(body.outputType) ? body.outputType : "rapporttekst",
    toon: isToon(body.toon) ? body.toon : "vriendelijk-direct",
  };

  try {
    const rapport = genereerRapportTekst(input);
    const output = {
      id: rapport.id,
      createdAt: rapport.createdAt,
      tekst: rapport.tekst,
      guardrail: rapport.guardrail,
    };

    const { data: rij, error } = await supabase
      .schema("facula")
      .from("reports")
      .insert({ user_id: user.id, input, output })
      .select("id, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: rij.id, createdAt: rij.created_at, report: rapport });
  } catch (err) {
    console.error("Rapport genereren/opslaan mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van de tekst." },
      { status: 500 }
    );
  }
}
