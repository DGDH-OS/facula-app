import { NextRequest, NextResponse } from "next/server";
import type { GeneratedLesson } from "@/lib/types";
import {
  bouwMihiribanPptxBuffer,
  mihiribanBestandsnaam,
} from "@/lib/pptx-export-mihiriban-style";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/lessons/[id]/pptx
 * Haalt een EERDER opgeslagen les op (RLS zorgt dat dit alleen lukt als de
 * les van de ingelogde gebruiker is) en bouwt daar de Mihiriban-stijl
 * PowerPoint van — bewijst dat de export op opgeslagen data werkt, niet
 * alleen op een verse generatie.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .select("id, input, output, created_at")
    .eq("id", id)
    .single();

  if (error || !rij) {
    return NextResponse.json({ error: "Les niet gevonden." }, { status: 404 });
  }

  const les: GeneratedLesson = {
    id: rij.id,
    createdAt: rij.created_at,
    input: rij.input,
    titel: rij.output.titel,
    kernbegrippen: rij.output.kernbegrippen,
    onderdelen: rij.output.onderdelen,
  };

  try {
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
    console.error("Mihiriban PowerPoint-export (opgeslagen les) mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van de PowerPoint." },
      { status: 500 }
    );
  }
}
