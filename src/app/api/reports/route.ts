import { NextRequest, NextResponse } from "next/server";
import type { ReportInput, RapportOutputType, RapportToon } from "@/lib/types";
import { genereerRapportTekst } from "@/lib/report-generator";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { quotaBoodschap, saveWithQuota } from "@/lib/quota";
import { limitString, readBodyWithLimit } from "@/lib/validation";

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

  const bodyResult = await readBodyWithLimit(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: "Aanvraag is te groot." }, { status: 413 });
  }

  let body: Partial<ReportInput>;
  try {
    body = JSON.parse(bodyResult.text);
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const leerlingLabel = limitString(body.leerlingLabel, 2000);
  const aantekeningen = limitString(body.aantekeningen, 2000);

  if (!leerlingLabel || !aantekeningen) {
    return NextResponse.json(
      { error: "Leerling en aantekeningen zijn verplicht en mogen maximaal 2000 tekens zijn." },
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
    // Zelfde volgorde als bij een toets: genereerRapportTekst() is lokaal en
    // kost niets, dus een voorcheck op het quotum spaart niets uit. De limiet
    // valt in saveWithQuota(), samen met de insert in één transactie.
    const rapport = genereerRapportTekst(input);
    const output = {
      id: rapport.id,
      createdAt: rapport.createdAt,
      tekst: rapport.tekst,
      guardrail: rapport.guardrail,
    };

    const opslag = await saveWithQuota(supabase, "reports", input, output);
    if (opslag.quotaExceeded) {
      return NextResponse.json(
        { error: quotaBoodschap("reports", opslag.regime, null) },
        { status: 402 }
      );
    }

    return NextResponse.json({ id: opslag.id, createdAt: opslag.createdAt, report: rapport });
  } catch (err) {
    console.error("Rapport genereren/opslaan mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van de tekst." },
      { status: 500 }
    );
  }
}
