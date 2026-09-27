import { NextRequest, NextResponse } from "next/server";
import type { GeneratedLesson } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVersion } from "@/lib/versioning";

/**
 * GET /api/lessons/[id]/versions/[versionNumber]
 * Eén specifieke eerdere versie, read-only (input+output zoals die op dat
 * moment was).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionNumber: string }> }
) {
  const { id, versionNumber: versionNumberRaw } = await params;
  const versionNumber = Number(versionNumberRaw);

  if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
    return NextResponse.json({ error: "Ongeldig versienummer." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  try {
    const versie = await getVersion<GeneratedLesson["input"], Omit<GeneratedLesson, "input">>(
      supabase,
      user.id,
      "lesson",
      id,
      versionNumber
    );

    if (!versie) {
      return NextResponse.json({ error: "Versie niet gevonden." }, { status: 404 });
    }

    return NextResponse.json(versie);
  } catch (err) {
    console.error("Versie ophalen mislukt", err);
    return NextResponse.json({ error: "Versie kon niet worden opgehaald." }, { status: 500 });
  }
}
