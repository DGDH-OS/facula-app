import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { lijktOpToken, tokenHash } from "@/lib/school-token";
import { readBodyWithLimit, zelfdeOrigin } from "@/lib/validation";

/**
 * POST /api/school/uitnodiging
 *
 * Accepteert een uitnodiging. Het token staat in de URL die de docent heeft
 * gekregen; deze route hasht het en geeft de hash aan
 * facula.accept_school_invite(). Het token zelf gaat nooit de database in.
 *
 * Alles wat de beslissing bepaalt, doet die functie zelf: geldigheid, verloop,
 * of het adres bij de uitnodiging of een schooldomein hoort, het aantal
 * docentplekken, en of deze docent al bij een andere school hoort. Deze route
 * vertaalt de uitkomst naar een Nederlandse zin en doet zelf geen enkele
 * controle die de uitkomst kan veranderen.
 */

/** Wat de docent leest, per uitkomst van de databasefunctie. */
const MELDING: Record<string, string> = {
  ok: "Je hoort nu bij deze school.",
  ongeldig:
    "Deze uitnodiging bestaat niet of is al gebruikt. Vraag je beheerder om een nieuwe link.",
  verlopen:
    "Deze uitnodiging is verlopen. Vraag je beheerder om een nieuwe link.",
  verkeerd_domein:
    "Deze uitnodiging hoort bij een ander e-mailadres. Log in met het adres waar je de link op hebt gekregen, of vraag je beheerder om een uitnodiging voor dit adres.",
  vol: "Deze school heeft geen docentplek meer vrij. Vraag je beheerder om er een bij te laten zetten.",
  al_lid_andere_school:
    "Je hoort al bij een andere school in Facula. Vraag je beheerder daar om je eerst los te maken.",
  niet_ingelogd: "Log eerst in, dan kun je de uitnodiging accepteren.",
};

/** Welke uitkomst welke HTTP-status verdient. */
const STATUSCODE: Record<string, number> = {
  ok: 200,
  ongeldig: 404,
  verlopen: 410,
  verkeerd_domein: 403,
  vol: 409,
  al_lid_andere_school: 409,
  niet_ingelogd: 401,
};

export async function POST(request: NextRequest) {
  if (!zelfdeOrigin(request)) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: MELDING.niet_ingelogd }, { status: 401 });
  }

  const bodyResult = await readBodyWithLimit(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: "Aanvraag is te groot." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyResult.text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // Vormcheck vóór de databaseaanroep: wat niet op ons token lijkt, hoeft niet
  // gehasht en opgezocht te worden.
  if (!lijktOpToken(body.token)) {
    return NextResponse.json({ error: MELDING.ongeldig }, { status: 404 });
  }

  const { data, error } = await supabase
    .schema("facula")
    .rpc("accept_school_invite", { p_token_hash: tokenHash(body.token) })
    .single();

  if (error || !data) {
    console.error("Uitnodiging accepteren mislukt", error);
    return NextResponse.json(
      { error: "Er ging iets mis. Probeer het later opnieuw." },
      { status: 500 }
    );
  }

  const rij = data as { status: string; school_naam: string | null; rol: string | null };
  const melding = MELDING[rij.status] ?? MELDING.ongeldig;
  const status = STATUSCODE[rij.status] ?? 400;

  if (rij.status !== "ok") {
    return NextResponse.json(
      { error: melding, schoolNaam: rij.school_naam },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    melding,
    schoolNaam: rij.school_naam,
    rol: rij.rol,
  });
}
