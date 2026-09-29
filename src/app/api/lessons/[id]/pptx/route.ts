import { NextRequest, NextResponse } from "next/server";
import type { GeneratedLesson } from "@/lib/types";
import {
  bouwMihiribanPptxBuffer,
  mihiribanBestandsnaam,
} from "@/lib/pptx-export-mihiriban-style";
import { bouwLesPresentatie, slugify } from "@/lib/pptx-export";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { haalActiefLogoBestand, haalActieveHuisstijl } from "@/lib/huisstijl/actief";

/**
 * GET /api/lessons/[id]/pptx
 *
 * Haalt een EERDER opgeslagen les op (RLS zorgt dat dit alleen lukt als de les
 * van de ingelogde gebruiker is) en bouwt daar een PowerPoint van. Werkt dus
 * op opgeslagen data en niet alleen op een verse generatie.
 *
 * Twee varianten, gestuurd door de schakelaars op het lesscherm:
 *   ?huisstijl=1  de eigen kleuren en het lettertype van de docent
 *                 (src/lib/pptx-export.ts)
 *   anders        het vaste sjabloon met eigen opmaak en afbeeldingen
 *                 (src/lib/pptx-export-mihiriban-style.ts), het gedrag van
 *                 vóór deze schakelaars
 *   ?logo=0       het schoollogo weglaten, ook als het is ingesteld
 *
 * Het logo wordt server-side uit de private bucket gehaald. De browser krijgt
 * dus alleen de kant-en-klare PowerPoint en nooit een URL naar de bucket.
 */
export async function GET(
  request: NextRequest,
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
    .eq("user_id", user.id)
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

  const zoek = request.nextUrl.searchParams;
  const eigenHuisstijl = zoek.get("huisstijl") === "1";
  // De actieve huisstijl: die van de school als de school hem afdwingt, anders
  // de eigen stijl van de docent. Zie src/lib/huisstijl/actief.ts.
  const actief = await haalActieveHuisstijl(supabase, user.id);
  const huisstijl = actief.huisstijl;

  // Het logo staat aan zodra de docent er een heeft, tenzij hij het op dit
  // scherm uitzet of in zijn huisstijl standaard uit heeft staan.
  const logoGevraagd = zoek.has("logo")
    ? zoek.get("logo") === "1"
    : huisstijl.logoStandaardAan;
  const logo = logoGevraagd ? await haalActiefLogoBestand(supabase, actief) : null;

  try {
    const buffer = eigenHuisstijl
      ? ((await bouwLesPresentatie(les, { huisstijl, logo }).write({
          outputType: "nodebuffer",
        })) as Uint8Array)
      : await bouwMihiribanPptxBuffer(les, { logo });

    const bestandsnaam = eigenHuisstijl
      ? slugify(les.titel) + ".pptx"
      : mihiribanBestandsnaam(les);

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
    console.error("PowerPoint-export (opgeslagen les) mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van de PowerPoint." },
      { status: 500 }
    );
  }
}
