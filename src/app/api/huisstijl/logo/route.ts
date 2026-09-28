import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  geldigLogoPad,
  haalHuisstijl,
  HUISSTIJL_KOLOMMEN,
  LOGO_BUCKET,
  logoMimeType,
  logoPad,
  verwijderLogoObjecten,
} from "@/lib/huisstijl/server";
import { isToegestaanLogoType, maakLogo } from "@/lib/huisstijl/logo";
import { normaliseerLogo } from "@/lib/huisstijl/normalize-logo";
import { MAX_LOGO_BYTES, resolveHuisstijl } from "@/lib/huisstijl/themes";
import { zelfdeOrigin } from "@/lib/validation";

/**
 * Het schoollogo. Staat in de private bucket school-logos onder exact
 * "<user_id>/logo", dus één logo per docent en nooit een raadbare publieke
 * URL.
 *
 * Eén vast pad zonder extensie, en dat is de kern van deze route: een upload
 * overschrijft altijd datzelfde object (upsert) en verwijdert er nooit een
 * ander. In de vorige opzet droeg het pad de extensie, bestonden er per docent
 * twee mogelijke objecten, en moest elke upload het andere opruimen — waarmee
 * twee gelijktijdige uploads elkaars verse logo konden weghalen. Wat het pad
 * niet meer vertelt (het bestandstype) staat nu in facula.huisstijl.logo_mime.
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
 * Grens voor de aangekondigde content-length, vóór er een byte gelezen wordt.
 * Iets boven MAX_UPLOAD_BYTES omdat een multipart-body naast het bestand ook
 * de veldnamen en scheidingsregels meestuurt: ~2,2 MB laat een logo van 2 MB
 * ruim passeren en weigert de rest meteen.
 */
const MAX_AANGEKONDIGDE_BYTES = Math.round(MAX_LOGO_BYTES * 1.1);

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
  // haalHuisstijl() gooit een pad dat niet van deze docent is al weg; deze
  // regel maakt dat expliciet op de plek waar het pad echt gebruikt wordt.
  if (!geldigLogoPad(huisstijl.logoPath, user.id)) {
    return NextResponse.json({ error: "Geen logo ingesteld." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .download(logoPad(user.id));

  if (error || !data) {
    console.error("Schoollogo ophalen mislukt", error);
    return NextResponse.json({ error: "Logo niet gevonden." }, { status: 404 });
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  // Het pad heeft geen extensie meer, dus het type komt uit logo_mime of
  // anders uit de bestandskop. Niet uit data.type: die is niet altijd gezet,
  // en een leeg of verkeerd Content-Type maakt van een afbeelding een download
  // die de browser niet toont.
  const mime = logoMimeType(bytes, huisstijl.logoMime);
  if (!mime) {
    console.error("Schoollogo heeft geen herkenbaar bestandstype", { userId: user.id });
    return NextResponse.json({ error: "Logo niet gevonden." }, { status: 404 });
  }

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
  if (Number.isFinite(aangekondigd) && aangekondigd > MAX_AANGEKONDIGDE_BYTES) {
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

  // Het pad hangt alleen van de gebruiker af, niet van het bestandstype:
  // '<uid>/logo', de enige naam die het storage-beleid toelaat. Een png die
  // een jpg vervangt, schrijft dus over hetzelfde object heen. Daarmee hoeft
  // deze route niets te verwijderen, en kan een gelijktijdige upload van
  // dezelfde docent hooguit de laatste winnen — nooit een object weghalen
  // waar de rij naar wijst.
  const pad = logoPad(user.id);

  const { error: uploadFout } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(pad, genormaliseerd.bytes, {
      // Het bestandstype staat alleen nog hier en in logo_mime; het pad
      // draagt het niet meer.
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

  // Volgorde: eerst uploaden, dan pad én bestandstype in de database zetten.
  // Andersom zou een mislukte upload een rij achterlaten die naar een object
  // wijst dat er niet is.
  const { data, error } = await supabase
    .schema("facula")
    .from("huisstijl")
    .upsert(
      {
        user_id: user.id,
        logo_path: pad,
        logo_mime: genormaliseerd.mimeType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select(HUISSTIJL_KOLOMMEN)
    .single();

  if (error) {
    console.error("Logopad opslaan mislukt", error);
    // Het object blijft staan, en dat is hier de veilige keuze. Het ligt op
    // het ene bekende pad van deze docent: de volgende upload overschrijft
    // het, en accountverwijdering haalt het weg. Het is dus begrensd, in
    // tegenstelling tot een opruimpoging die bij samenloop het object kan
    // weghalen waar de rij van een andere aanvraag net naar is gaan wijzen.
    return NextResponse.json(
      { error: "Het logo kon niet worden opgeslagen. Probeer het opnieuw." },
      { status: 500 }
    );
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

  // Eerst de rij leegmaken, dan pas het object. De rij is wat de app leest:
  // zodra logo_path leeg is, toont geen enkel scherm en geen enkele export het
  // logo nog, en is het ook niet meer op te halen via GET hierboven.
  //
  // Andersom zou een mislukte rij-update een docent achterlaten die "verwijder
  // logo" zag slagen terwijl zijn huisstijl het logo gewoon blijft gebruiken.
  const { data, error } = await supabase
    .schema("facula")
    .from("huisstijl")
    .upsert(
      {
        user_id: user.id,
        logo_path: null,
        logo_mime: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select(HUISSTIJL_KOLOMMEN)
    .single();

  if (error) {
    console.error("Logopad wissen mislukt", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het verwijderen van het logo." },
      { status: 500 }
    );
  }

  // Nu pas het object. Lukt dat niet, dan is dat geen mislukte verwijdering
  // voor de docent: het logo is nergens meer zichtbaar of op te halen, en het
  // achtergebleven object ligt op het ene bekende pad — de volgende upload
  // overschrijft het, accountverwijdering haalt het weg. Begrensd dus, en een
  // 500 teruggeven zou de docent laten denken dat er niets gebeurd is terwijl
  // zijn huisstijl al bijgewerkt is.
  if (!(await verwijderLogoObjecten(supabase, [logoPad(user.id)]))) {
    console.error("Schoollogo-object bleef staan na wissen van de rij", {
      userId: user.id,
    });
  }

  return NextResponse.json({ huisstijl: resolveHuisstijl(data) });
}
