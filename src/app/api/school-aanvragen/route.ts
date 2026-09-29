import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { clampInt, limitString, readBodyWithLimit, zelfdeOrigin } from "@/lib/validation";

/**
 * POST /api/school-aanvragen
 *
 * Een school vraagt een licentie of een pilot aan. Dit is de enige route in de
 * app die zonder ingelogde gebruiker schrijft, en daarom de enige waar de
 * bescherming volledig hier moet zitten:
 *
 *   1. Origin-controle: een formulier op een andere site komt niet binnen.
 *      Zelfde patroon als POST /api/account/delete.
 *   2. Bodylimiet vóór JSON.parse, en per veld een maximum dat gelijk is aan
 *      de check in de migratie. De database is de ondergrens, niet de eerste
 *      verdediging.
 *   3. Een rem op herhaald indienen: hetzelfde e-mailadres mag hoogstens drie
 *      aanvragen per etmaal. Dat houdt een dubbelklik en een verveelde
 *      bezoeker tegen zonder een school te blokkeren die na een week nog eens
 *      belt.
 *
 * Wat deze rem NIET tegenhoudt, en dat hoort hier expliciet te staan: iemand
 * die met steeds een ander e-mailadres indient. De Origin-header is met curl
 * te zetten, dus dit is geen slot. De echte rem daarvoor hoort op de
 * netwerklaag (Vercel Firewall of BotID) en staat nog niet aan; zolang dat zo
 * is, kan deze tabel volgeschreven worden met rommel. Geen datalek en geen
 * mailstroom, want er gaat niets uit en niemand kan hem lezen behalve wij,
 * maar wel iets om aan te zetten voordat dit formulier echt bekend wordt.
 *
 * Er gaat bewust geen mail uit. Dat is geen vergeten stap: de gedeelde
 * Supabase-instantie stuurt auth-mail via de ingebouwde SMTP en die
 * reputatie houden we schoon (zie de auth-mail-afspraak in de projectnotities).
 * De aanvraag staat in facula.school_aanvragen en wordt daar opgepakt.
 *
 * De service-role-client is hier de juiste keuze en geen kortere weg: de tabel
 * heeft RLS aan zonder policy en geen rechten voor anon, dus deze route is per
 * constructie de enige ingang. Er komt niets uit de body dat bepaalt WAAR
 * geschreven wordt.
 */

const MAX_SCHOOLNAAM = 200;
const MAX_CONTACTPERSOON = 120;
const MAX_EMAIL = 200;
const MAX_TELEFOON = 40;
const MAX_BERICHT = 2000;
const MAX_AANVRAGEN_PER_ETMAAL = 3;

/**
 * Bewust een minimale controle: een adres met een apenstaartje, een punt erna
 * en geen witruimte. Strenger filteren kost echte adressen (een school met een
 * lang subdomein) en levert niets op, want of het adres bestaat weten we pas
 * als iemand antwoordt.
 */
function isEmailachtig(waarde: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(waarde);
}

export async function POST(request: NextRequest) {
  if (!zelfdeOrigin(request)) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 403 });
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

  const schoolnaam = limitString(body.schoolnaam, MAX_SCHOOLNAAM);
  const contactpersoon = limitString(body.contactpersoon, MAX_CONTACTPERSOON);
  const email = limitString(body.email, MAX_EMAIL);

  if (!schoolnaam || schoolnaam.length < 2) {
    return NextResponse.json(
      { error: "Vul de naam van je school in." },
      { status: 400 }
    );
  }
  if (!contactpersoon || contactpersoon.length < 2) {
    return NextResponse.json({ error: "Vul je naam in." }, { status: 400 });
  }
  if (!email || !isEmailachtig(email)) {
    return NextResponse.json(
      { error: "Vul een e-mailadres in waarop we je kunnen bereiken." },
      { status: 400 }
    );
  }

  const telefoonRuw = body.telefoon === undefined ? "" : body.telefoon;
  const telefoon = limitString(telefoonRuw ?? "", MAX_TELEFOON);
  if (telefoon === null) {
    return NextResponse.json(
      { error: "Het telefoonnummer is te lang." },
      { status: 400 }
    );
  }

  const berichtRuw = body.bericht === undefined ? "" : body.bericht;
  const bericht = limitString(berichtRuw ?? "", MAX_BERICHT);
  if (bericht === null) {
    return NextResponse.json(
      { error: "Je bericht mag maximaal " + MAX_BERICHT + " tekens zijn." },
      { status: 400 }
    );
  }

  // Leeg veld en "weet ik niet" zijn hetzelfde geval: geen getal meesturen.
  let aantalDocenten: number | null = null;
  if (body.aantalDocenten !== undefined && body.aantalDocenten !== null && body.aantalDocenten !== "") {
    aantalDocenten = clampInt(body.aantalDocenten, 1, 5000);
    if (aantalDocenten === null) {
      return NextResponse.json(
        { error: "Vul een aantal docenten tussen 1 en 5000 in, of laat het leeg." },
        { status: 400 }
      );
    }
  }

  const supabase = createServiceRoleClient();
  const etmaalTerug = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error: telFout } = await supabase
    .schema("facula")
    .from("school_aanvragen")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", etmaalTerug);

  if (telFout) {
    // Fail-closed: kunnen we de rem niet lezen, dan slaan we niets op. Een
    // aanvraag die verloren gaat is hinderlijk; een open schrijfpad is erger.
    console.error("Schoolaanvragen tellen mislukt", telFout);
    return NextResponse.json(
      { error: "Er ging iets mis. Probeer het later opnieuw." },
      { status: 500 }
    );
  }

  if ((count ?? 0) >= MAX_AANVRAGEN_PER_ETMAAL) {
    /*
     * Boven de rem: niets opslaan, maar wel het gewone antwoord geven.
     *
     * Een 429 met "je hebt al aangevraagd" zou een vraag beantwoorden die
     * niemand mag stellen: of school X zich bij ons gemeld heeft. Met dit
     * adres is dat na één poging te achterhalen. Voor de docent die twee keer
     * op de knop drukt maakt het geen verschil: zijn aanvraag staat er al, en
     * het scherm zegt hetzelfde als de eerste keer.
     */
    console.warn("Schoolaanvraag geweigerd door de rem (niet opgeslagen)");
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .schema("facula")
    .from("school_aanvragen")
    .insert({
      schoolnaam,
      contactpersoon,
      email,
      telefoon: telefoon || null,
      aantal_docenten: aantalDocenten,
      bericht: bericht || null,
      bron: "website",
    });

  if (error) {
    console.error("Schoolaanvraag opslaan mislukt", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het versturen. Probeer het later opnieuw." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
