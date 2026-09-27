import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listVersions } from "@/lib/versioning";

/**
 * GET /api/lessons/[id]/versions
 * Lijst van eerdere versies van deze les (versienummer + timestamp, geen
 * volledige input/output — dat haalt de detail-route op).
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

  // Bevestig dat de les van deze gebruiker is vóór de versies opgehaald
  // worden — zelfde verdedigingslaag als de andere lesson-routes.
  const { data: les, error: lesError } = await supabase
    .schema("facula")
    .from("lessons")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (lesError || !les) {
    return NextResponse.json({ error: "Les niet gevonden." }, { status: 404 });
  }

  try {
    const versions = await listVersions(supabase, user.id, "lesson", id);
    return NextResponse.json({ versions });
  } catch (err) {
    console.error("Versiegeschiedenis ophalen mislukt", err);
    return NextResponse.json(
      { error: "Versiegeschiedenis kon niet worden opgehaald." },
      { status: 500 }
    );
  }
}
