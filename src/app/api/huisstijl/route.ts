import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HUISSTIJL_KOLOMMEN } from "@/lib/huisstijl/server";
import { haalActieveHuisstijl } from "@/lib/huisstijl/actief";
import {
  controleerContrast,
  normaliseerHex,
  PRESETS,
  resolveHuisstijl,
  type Kleurenset,
  type Lettertype,
  type PresetNaam,
} from "@/lib/huisstijl/themes";
import { limitString, readBodyWithLimit } from "@/lib/validation";

const PRESET_NAMEN: PresetNaam[] = ["facula", "mihiriban", "rustig", "contrast", "eigen"];
const MAX_SCHOOLNAAM = 120;

function isPreset(waarde: unknown): waarde is PresetNaam {
  return typeof waarde === "string" && (PRESET_NAMEN as string[]).includes(waarde);
}

function isLettertype(waarde: unknown): waarde is Lettertype {
  return waarde === "sans" || waarde === "serif";
}

/**
 * GET /api/huisstijl
 *
 * Geeft de huisstijl die NU geldt (`huisstijl`), plus de eigen huisstijl van de
 * docent (`eigen`) en wat zijn school ervan vindt. Drie dingen in één antwoord,
 * omdat twee schermen elk iets anders nodig hebben:
 *
 *   - de voorvertoning bij een export wil de stijl die eruit komt rollen, en
 *     dat is bij een afgedwongen schoolhuisstijl niet de eigen stijl;
 *   - het instelscherm /app/huisstijl wil de eigen stijl om te kunnen
 *     bewerken, plus de mededeling dat de school hem overstemt.
 *
 * Geeft altijd een bruikbare stijl terug, ook zonder opgeslagen rij: dan de
 * schoolhuisstijl, en zonder school de standaardstijl van Facula.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const actief = await haalActieveHuisstijl(supabase, user.id);
  return NextResponse.json(
    {
      huisstijl: actief.huisstijl,
      eigen: actief.eigen,
      bron: actief.bron,
      schoolNaam: actief.schoolNaam,
      schoolAfdwingen: actief.afdwingen,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * PUT /api/huisstijl
 * Slaat de huisstijl op. De user_id komt ALTIJD uit de server-side sessie,
 * nooit uit de body, dus een client kan nooit voor iemand anders schrijven.
 *
 * Het logo wordt hier bewust NIET aangeraakt: dat loopt via
 * /api/huisstijl/logo. Zo kan een docent kleuren wijzigen zonder dat een
 * mislukte opslag zijn logo kwijtmaakt.
 */
export async function PUT(request: NextRequest) {
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

  if (!isPreset(body.preset)) {
    return NextResponse.json({ error: "Kies een geldige stijl." }, { status: 400 });
  }
  const preset = body.preset;

  // Bij een vaste preset zijn de kleuren die van de preset. Wat de client
  // meestuurt wordt genegeerd, zodat "Rustig grijsblauw" bij iedereen ook
  // echt rustig grijsblauw is.
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

    // Dezelfde contrastcheck als in het scherm, nog een keer op de server:
    // het scherm blokkeert de knop, dit blokkeert de opslag.
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

  const schoolnaamRuw = body.schoolnaam === null ? "" : body.schoolnaam;
  const schoolnaam = limitString(schoolnaamRuw ?? "", MAX_SCHOOLNAAM);
  if (schoolnaam === null) {
    return NextResponse.json(
      { error: "De schoolnaam mag maximaal " + MAX_SCHOOLNAAM + " tekens zijn." },
      { status: 400 }
    );
  }

  const logoStandaardAan = body.logoStandaardAan !== false;

  const { data, error } = await supabase
    .schema("facula")
    .from("huisstijl")
    .upsert(
      {
        user_id: user.id,
        preset,
        accent: kleuren.accent,
        tekst: kleuren.tekst,
        achtergrond: kleuren.achtergrond,
        lettertype: kleuren.lettertype,
        schoolnaam: schoolnaam || null,
        logo_standaard_aan: logoStandaardAan,
        // updated_at niet: die zet de database zelf (trigger
        // huisstijl_set_updated_at), zodat alle tijden in deze tabel van
        // dezelfde klok komen.
      },
      { onConflict: "user_id" }
    )
    .select(HUISSTIJL_KOLOMMEN)
    .single();

  if (error) {
    console.error("Huisstijl opslaan mislukt", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het opslaan van je huisstijl." },
      { status: 500 }
    );
  }

  return NextResponse.json({ huisstijl: resolveHuisstijl(data) });
}
