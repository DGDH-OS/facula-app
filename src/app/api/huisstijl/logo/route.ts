import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { haalHuisstijl, LOGO_BUCKET, verwijderLogoObject } from "@/lib/huisstijl/server";
import { bestandsExtensie, isToegestaanLogoType, maakLogo } from "@/lib/huisstijl/logo";
import { normaliseerLogo } from "@/lib/huisstijl/normalize-logo";
import { MAX_LOGO_BYTES, resolveHuisstijl } from "@/lib/huisstijl/themes";
import { zelfdeOrigin } from "@/lib/validation";

/**
 * Het schoollogo. Staat in de private bucket school-logos onder
 * "<user_id>/logo.<ext>", dus één logo per docent en nooit een raadbare
 * publieke URL.
 *
 * Elk logo wordt bij de upload genormaliseerd (gedraaid volgens EXIF,
 * metadata eraf, verkleind tot binnen 600x300 px): zie normalize-logo.ts.
 * Het origineel wordt niet bewaard.
 *
 * Alleen png en jpeg. SVG is bewust geweigerd en niet "schoongemaakt": een
 * SVG is een XML-document dat scripts en externe verwijzingen kan bevatten,
 * en het betrouwbaar strippen daarvan is een eigen project. Een docent die
 * alleen een SVG heeft, exporteert hem eenmalig als PNG; dat is een kleine
 * moeite tegenover een bestandstype dat in de browser uitvoerbaar is.
 */

const MAX_UPLOAD_BYTES = MAX_LOGO_BYTES;

/**
 * GET /api/huisstijl/logo
 * Levert het logo van de ingelogde docent als afbeelding. Dit is het enige
 * pad waarlangs een logo de bucket verlaat: de bucket zelf is privé.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const huisstijl = await haalHuisstijl(supabase, user.id);
  if (!huisstijl.logoPath) {
    return NextResponse.json({ error: "Geen logo ingesteld." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .download(huisstijl.logoPath);

  if (error || !data) {
    console.error("Schoollogo ophalen mislukt", error);
    return NextResponse.json({ error: "Logo niet gevonden." }, { status: 404 });
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const mime = data.type || (huisstijl.logoPath.endsWith(".png") ? "image/png" : "image/jpeg");

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": mime,
      // private: het logo hoort in de browsercache van deze docent te mogen
      // staan, maar nooit in een gedeelde cache onderweg.
      "Cache-Control": "private, max-age=60",
    },
  });
}

/**
 * POST /api/huisstijl/logo
 * Uploadt een nieuw logo (multipart/form-data, veld "logo") en zet het pad in
 * facula.huisstijl. Vervangt een bestaand logo.
 */
export async function POST(request: NextRequest) {
  if (!zelfdeOrigin(request)) {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  // Grootte eerst uit de header, vóór er een byte gelezen wordt.
  const aangekondigd = Number(request.headers.get("content-length"));
  if (Number.isFinite(aangekondigd) && aangekondigd > MAX_UPLOAD_BYTES * 2) {
    return NextResponse.json({ error: "Het bestand is te groot." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const bestand = formData.get("logo");
  if (!(bestand instanceof File)) {
    return NextResponse.json({ error: "Kies eerst een bestand." }, { status: 400 });
  }
  if (bestand.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Het logo mag maximaal 2 MB zijn." },
      { status: 413 }
    );
  }
  if (!isToegestaanLogoType(bestand.type)) {
    return NextResponse.json(
      { error: "Kies een PNG- of JPG-bestand." },
      { status: 415 }
    );
  }

  const bytes = new Uint8Array(await bestand.arrayBuffer());
  // Niet op het opgegeven type vertrouwen: maakLogo leest de bestandskop en
  // weigert alles wat geen echte PNG of JPEG is, ook als de client
  // "image/png" beweert.
  const logo = maakLogo(bytes, bestand.type);
  if (!logo) {
    return NextResponse.json(
      { error: "Dit bestand is geen geldige PNG of JPG." },
      { status: 415 }
    );
  }

  // Pas ná de kopcontrole door sharp: verkleind, gedraaid volgens EXIF en
  // zonder metadata. Wat hier uitkomt is wat er bewaard wordt, het origineel
  // wordt nooit opgeslagen.
  const genormaliseerd = await normaliseerLogo(logo.bytes);
  if (!genormaliseerd) {
    return NextResponse.json(
      { error: "Dit bestand kon niet verwerkt worden. Probeer een andere PNG of JPG." },
      { status: 415 }
    );
  }

  const huidige = await haalHuisstijl(supabase, user.id);
  const pad = user.id + "/logo." + bestandsExtensie(genormaliseerd.mimeType);

  const { error: uploadFout } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(pad, genormaliseerd.bytes, {
      contentType: genormaliseerd.mimeType,
      upsert: true,
    });

  if (uploadFout) {
    console.error("Schoollogo uploaden mislukt", uploadFout);
    return NextResponse.json(
      { error: "Het uploaden lukte niet. Probeer het opnieuw." },
      { status: 500 }
    );
  }

  // Volgorde: eerst uploaden, dan het pad in de database zetten, en pas
  // daarna het oude object weggooien. Andersom (eerst het oude weg) zou een
  // mislukte database-update een docent zonder logo achterlaten terwijl zijn
  // huisstijl nog naar het verdwenen bestand wijst.
  const { data, error } = await supabase
    .schema("facula")
    .from("huisstijl")
    .upsert({ user_id: user.id, logo_path: pad, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select(
      "preset, accent, tekst, achtergrond, lettertype, schoolnaam, logo_path, logo_standaard_aan"
    )
    .single();

  if (error) {
    console.error("Logopad opslaan mislukt", error);
    // De rij verwijst niet naar dit object, dus het hoort er niet te blijven
    // staan. Alleen als het nieuwe pad hetzelfde is als het opgeslagen pad
    // blijft het staan: dan is het het bestand waar de huisstijl nog naar
    // wijst, en zou opruimen juist een werkend logo slopen.
    if (pad !== huidige.logoPath) {
      await verwijderLogoObject(supabase, pad);
    }
    return NextResponse.json(
      { error: "Het logo kon niet worden opgeslagen. Probeer het opnieuw." },
      { status: 500 }
    );
  }

  // Een png die een jpg vervangt laat het oude object achter: dat heeft een
  // andere extensie en wordt dus niet overschreven.
  if (huidige.logoPath && huidige.logoPath !== pad) {
    await verwijderLogoObject(supabase, huidige.logoPath);
  }

  return NextResponse.json({ huisstijl: resolveHuisstijl(data) });
}

/**
 * DELETE /api/huisstijl/logo
 * Verwijdert het logo uit storage en haalt het pad uit de huisstijl.
 */
export async function DELETE(request: NextRequest) {
  if (!zelfdeOrigin(request)) {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const huidige = await haalHuisstijl(supabase, user.id);

  // Zelfde volgorde-gedachte als bij de upload: eerst de database, dan pas het
  // object. Zou het object er eerst uit gaan en de update daarna mislukken,
  // dan wees de huisstijl naar een bestand dat niet meer bestaat.
  const { data, error } = await supabase
    .schema("facula")
    .from("huisstijl")
    .upsert({ user_id: user.id, logo_path: null, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select(
      "preset, accent, tekst, achtergrond, lettertype, schoolnaam, logo_path, logo_standaard_aan"
    )
    .single();

  if (error) {
    console.error("Logopad wissen mislukt", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het verwijderen van het logo." },
      { status: 500 }
    );
  }

  await verwijderLogoObject(supabase, huidige.logoPath);

  return NextResponse.json({ huisstijl: resolveHuisstijl(data) });
}
