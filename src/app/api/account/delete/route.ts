import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { haalHuisstijl, verwijderLogoObject } from "@/lib/huisstijl/server";
import { readBodyWithLimit } from "@/lib/validation";

/**
 * POST /api/account/delete
 * Verwijdert het account van de ingelogde gebruiker permanent. Alle
 * facula-tabellen hebben een FK naar auth.users ON DELETE CASCADE, dus het
 * verwijderen van de auth-user ruimt automatisch alle lessen/toetsen/
 * rapporten/versies/gebruikstellers van deze gebruiker mee op.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || !host || originHost !== host) {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 403 });
  }

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

  let body: { confirm?: unknown };
  try {
    body = JSON.parse(bodyResult.text);
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (body.confirm !== "VERWIJDER") {
    return NextResponse.json(
      { error: "Typ VERWIJDER om je account definitief te verwijderen." },
      { status: 400 }
    );
  }

  // Het schoollogo staat in storage en niet in een tabel, dus de
  // ON DELETE CASCADE op auth.users ruimt het niet mee op. Het object moet er
  // dus eerst uit, zolang de sessie nog bestaat: daarna is de gebruiker weg en
  // is er niemand meer die er volgens het storage-beleid bij mag.
  const huisstijl = await haalHuisstijl(supabase, user.id);
  await verwijderLogoObject(supabase, huisstijl.logoPath);

  try {
    const serviceRole = createServiceRoleClient();
    const { error } = await serviceRole.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (err) {
    console.error("Account verwijderen mislukt", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het verwijderen van je account." },
      { status: 500 }
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
