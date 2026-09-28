import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  claimLogoLease,
  LOGO_LEASE_BEZET_MELDING,
  releaseLogoLease,
  verwijderAlleLogoObjecten,
} from "@/lib/huisstijl/server";
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
  // ON DELETE CASCADE op auth.users ruimt het niet mee op. De hele map van
  // deze docent moet er dus eerst uit, zolang de sessie nog bestaat: daarna is
  // de gebruiker weg en is er niemand meer die er volgens het storage-beleid
  // bij mag.
  //
  // verwijderAlleLogoObjecten() haalt het vaste pad '<user_id>/logo' expliciet
  // weg, plus alles wat een paginerende listing van de map nog oplevert, en
  // controleert daarna dat de map echt leeg is.
  //
  // Lukt dat niet, dan gaat de verwijdering niet door. Een account weggooien
  // terwijl het logo blijft staan is geen verwijdering maar een onbereikbaar
  // restant, en dat is precies wat een docent niet vraagt als hij op
  // "verwijder mijn account" klikt.
  // Onder dezelfde lease als POST en DELETE op /api/huisstijl/logo. Zonder die
  // lease kan een upload die net bezig is zijn object neerzetten nádat deze
  // route de map heeft leeggemaakt en gecontroleerd: het account is dan weg en
  // het logo blijft liggen, buiten bereik van iedereen die het nog mag
  // verwijderen. Precies het restant dat de controle hieronder hoort uit te
  // sluiten.
  const lease = await claimLogoLease(supabase);
  if (lease.status === "bezet") {
    return NextResponse.json({ error: LOGO_LEASE_BEZET_MELDING }, { status: 409 });
  }
  if (lease.status === "fout") {
    return NextResponse.json(
      { error: "Er ging iets mis bij het verwijderen van je account." },
      { status: 500 }
    );
  }

  let accountVerwijderd = false;
  try {
    const logosWeg = await verwijderAlleLogoObjecten(supabase, user.id);
    if (!logosWeg) {
      return NextResponse.json(
        {
          error:
            "Je schoollogo kon niet worden verwijderd, dus je account is niet verwijderd. Probeer het later opnieuw.",
        },
        { status: 500 }
      );
    }

    try {
      const serviceRole = createServiceRoleClient();
      const { error } = await serviceRole.auth.admin.deleteUser(user.id);
      if (error) throw error;
      accountVerwijderd = true;
    } catch (err) {
      console.error("Account verwijderen mislukt", err);
      return NextResponse.json(
        { error: "Er ging iets mis bij het verwijderen van je account." },
        { status: 500 }
      );
    }
  } finally {
    // Alleen teruggeven zolang er nog iets is om terug te geven: is de
    // auth-user weg, dan is de huisstijl-rij met de lease erin via ON DELETE
    // CASCADE mee verdwenen en zou de aanroep alleen een foutregel in de logs
    // opleveren.
    if (!accountVerwijderd) await releaseLogoLease(supabase, lease.token);
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
