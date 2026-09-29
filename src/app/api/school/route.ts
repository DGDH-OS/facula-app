import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  controleerContrast,
  normaliseerHex,
  PRESETS,
  type Kleurenset,
  type Lettertype,
  type PresetNaam,
} from "@/lib/huisstijl/themes";
import { limitString, readBodyWithLimit, zelfdeOrigin } from "@/lib/validation";

/**
 * PUT /api/school
 *
 * De instellingen van de school: naam, huisstijl en of die huisstijl voor
 * iedereen geldt. Zelfde opzet als PUT /api/huisstijl voor een docent, met
 * dezelfde contrastcheck op de server.
 *
 * Waarom dit een route is en geen directe update uit de browser: de
 * contrastcheck hoort aan de serverkant te staan. Het scherm blokkeert de knop,
 * dit blokkeert de opslag, en een export in onleesbare kleuren op een beamer is
 * precies wat die twee samen moeten voorkomen.
 *
 * De update loopt via de sessie-client van de beheerder, niet via service_role.
 * Twee lagen doen daardoor hun werk zonder dat deze route ze nabouwt:
 *
 *   - de policy schools_update_beheerder: alleen de eigen school, alleen als
 *     beheerder;
 *   - het kolomrecht: alleen naam, huisstijl en enforce_huisstijl zijn te
 *     wijzigen. Stuurt iemand hier `seat_limit` mee, dan valt dat niet alleen
 *     buiten de lijst hieronder, maar zou de database het ook weigeren.
 *
 * Het schoollogo loopt via /api/school/logo, net als bij een docent: kleuren
 * wijzigen mag nooit het logo kwijtmaken.
 */

const PRESET_NAMEN: PresetNaam[] = ["facula", "mihiriban", "rustig", "contrast", "eigen"];
const MAX_NAAM = 200;

function isPreset(waarde: unknown): waarde is PresetNaam {
  return typeof waarde === "string" && (PRESET_NAMEN as string[]).includes(waarde);
}

function isLettertype(waarde: unknown): waarde is Lettertype {
  return waarde === "sans" || waarde === "serif";
}

export async function PUT(request: NextRequest) {
  if (!zelfdeOrigin(request)) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 403 });
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

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyResult.text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const naam = limitString(body.naam, MAX_NAAM);
  if (!naam || naam.length < 2) {
    return NextResponse.json(
      { error: "Vul de naam van de school in." },
      { status: 400 }
    );
  }

  if (!isPreset(body.preset)) {
    return NextResponse.json({ error: "Kies een geldige stijl." }, { status: 400 });
  }
  const preset = body.preset;

  // Bij een vaste preset zijn de kleuren die van de preset, wat de client ook
  // meestuurt. Zo is "Rustig grijsblauw" bij elke school hetzelfde.
  let kleuren: Kleurenset;
  if (preset === "eigen") {
    const accent = normaliseerHex(body.accent);
    const tekst = normaliseerHex(body.tekst);
    const achtergrond = normaliseerHex(body.achtergrond);
    if (!accent || !tekst || !achtergrond || !isLettertype(body.lettertype)) {
      return NextResponse.json(
        { error: "Vul drie geldige kleuren en een lettertype in." },
        { status: 400 }
      );
    }
    kleuren = { accent, tekst, achtergrond, lettertype: body.lettertype };

    const controle = controleerContrast(kleuren);
    if (!controle.ok) {
      return NextResponse.json(
        { error: controle.meldingen.join(" "), contrast: controle },
        { status: 400 }
      );
    }
  } else {
    kleuren = PRESETS[preset];
  }

  const afdwingen = body.afdwingen === true;

  // De school komt uit de database, niet uit de body: facula.mijn_school_id()
  // leest het actieve lidmaatschap van de sessie.
  const { data: schoolId, error: schoolFout } = await supabase
    .schema("facula")
    .rpc("mijn_school_id");

  if (schoolFout || !schoolId) {
    return NextResponse.json({ error: "Je hoort niet bij een school." }, { status: 403 });
  }

  const { data, error } = await supabase
    .schema("facula")
    .from("schools")
    .update({
      name: naam,
      huisstijl_preset: preset,
      accent: kleuren.accent,
      tekst: kleuren.tekst,
      achtergrond: kleuren.achtergrond,
      lettertype: kleuren.lettertype,
      enforce_huisstijl: afdwingen,
      // updated_at niet: die zet de trigger schools_set_updated_at, zodat alle
      // tijden in deze tabel van dezelfde klok komen.
    })
    .eq("id", schoolId)
    .select("id, name, huisstijl_preset, accent, tekst, achtergrond, lettertype, enforce_huisstijl")
    .maybeSingle();

  if (error) {
    console.error("Schoolinstellingen opslaan mislukt", error);
    return NextResponse.json(
      { error: "Opslaan lukte niet. Probeer het opnieuw." },
      { status: 500 }
    );
  }

  if (!data) {
    // Geen rij geraakt betekent hier: de policy liet het niet toe. Dat is de
    // enige manier waarop een geldige update nul rijen oplevert.
    return NextResponse.json(
      { error: "Alleen een beheerder van deze school kan dit wijzigen." },
      { status: 403 }
    );
  }

  return NextResponse.json({ school: data });
}
