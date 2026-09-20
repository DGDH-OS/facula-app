import { NextRequest, NextResponse } from "next/server";
import type { LessonInput, Vak, Niveau } from "@/lib/types";
import { genereerLes } from "@/lib/lesson-generator";
import {
  bouwMihiribanPptxBuffer,
  mihiribanBestandsnaam,
} from "@/lib/pptx-export-mihiriban-style";

const VAKKEN: Vak[] = ["Maatschappijleer", "Geschiedenis", "Economie", "Aardrijkskunde"];
const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

function isVak(v: unknown): v is Vak {
  return typeof v === "string" && (VAKKEN as string[]).includes(v);
}

function isNiveau(v: unknown): v is Niveau {
  return typeof v === "string" && (NIVEAUS as string[]).includes(v);
}

/**
 * POST /api/lessons/mihiriban-pptx
 * Genereert een les via genereerLes() en retourneert direct de bijbehorende
 * PowerPoint in Mihiriban's eigen sjabloon-stijl als download — één actie,
 * geen tussenstap.
 */
export async function POST(request: NextRequest) {
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
    const les = genereerLes(input);
    const buffer = await bouwMihiribanPptxBuffer(les);
    const bestandsnaam = mihiribanBestandsnaam(les);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${bestandsnaam}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Mihiriban PowerPoint-export mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van de PowerPoint." },
      { status: 500 }
    );
  }
}
