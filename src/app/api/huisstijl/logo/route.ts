import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  claimLogoLease,
  geldigLogoPad,
  haalHuisstijl,
  LOGO_BUCKET,
  LOGO_LEASE_BEZET_MELDING,
  LOGO_LEASE_VERLOPEN_MELDING,
  logoLeaseNogGeldig,
  logoMimeType,
  logoPad,
  releaseLogoLease,
  schrijfLogoMetLease,
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
 * Wat één vast pad niet oplost, is een upload en een verwijdering die door
 * elkaar lopen: die raken hetzelfde object van twee kanten, en het object
 * (storage) en de rij (facula.huisstijl) zijn niet samen in een transactie te
 * zetten. Daarom claimen POST en DELETE eerst een lease op het logo van deze
 * docent (facula.claim_logo_lock, 30 seconden) en geven die in een finally
 * terug. Is de lease bezet, dan volgt een 409 in plaats van een tweede
 * gelijktijdige mutatie.
 *
 * Elke claim krijgt een eigen token, en dat token moet mee bij elke
 * schrijfactie. Een aanvraag die langer doet dan 30 seconden is zijn lease
 * kwijt; zonder token zou hij daarna alsnog schrijven en bovendien de lease van
 * zijn opvolger wissen. Met token raakt hij nul rijen en eindigt hij in een
 * 409. Zie 20260928120000_facula_huisstijl.sql.
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

  // Pas hier de lease claimen, en niet bovenaan: alles hierboven leest en
  // controleert alleen het aangeleverde bestand en raakt niets wat een andere
  // aanvraag ook gebruikt. Zo staat de lease alleen tijdens het schrijfwerk en
  // wacht een tweede poging niet op een verwerking die nog nergens toe leidt.
  const lease = await claimLogoLease(supabase);
  if (lease.status === "bezet") {
    return NextResponse.json({ error: LOGO_LEASE_BEZET_MELDING }, { status: 409 });
  }
  if (lease.status === "fout") {
    return NextResponse.json(
      { error: "Het uploaden lukte niet. Probeer het opnieuw." },
      { status: 500 }
    );
  }

  try {
    // Het pad hangt alleen van de gebruiker af, niet van het bestandstype:
    // '<uid>/logo', de enige naam die het storage-beleid toelaat. Een png die
    // een jpg vervangt, schrijft dus over hetzelfde object heen. Deze route
    // hoeft dus niets te verwijderen; wat er tijdens het schrijven niet naast
    // kan gebeuren, houdt de lease tegen.
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
    //
    // De schrijfactie controleert zelf, in hetzelfde statement, of de lease met
    // dit token nog loopt. Duurde het uploaden hierboven zo lang dat de lease
    // verliep en een andere aanvraag hem overnam, dan raakt dit nul rijen en
    // schrijft deze aanvraag niets: zijn pad zou dwars door de mutatie van die
    // ander heen gaan.
    const geschreven = await schrijfLogoMetLease(
      supabase,
      lease.token,
      pad,
      genormaliseerd.mimeType
    );

    if (geschreven.status === "verlopen") {
      // Het object staat er wel, de rij wijst er niet naar. Dat is dezelfde
      // toestand als een mislukte rijmutatie hieronder: het object ligt op het
      // ene bekende pad van deze docent en gaat mee met de volgende upload of
      // met accountverwijdering.
      console.error("Logo-lease verlopen vóór de rijmutatie", { userId: user.id });
      return NextResponse.json(
        { error: LOGO_LEASE_VERLOPEN_MELDING },
        { status: 409 }
      );
    }

    if (geschreven.status === "fout") {
      // Het object blijft staan, en dat is hier de veilige keuze. Het ligt op
      // het ene bekende pad van deze docent: de volgende upload overschrijft
      // het, en accountverwijdering haalt het weg. Opruimen zou de docent geen
      // stap verder brengen en een geslaagde upload weggooien waarvan alleen
      // de rij nog miste.
      return NextResponse.json(
        { error: "Het logo kon niet worden opgeslagen. Probeer het opnieuw." },
        { status: 500 }
      );
    }

    return NextResponse.json({ huisstijl: resolveHuisstijl(geschreven.rij) });
  } finally {
    // Ook bij een fout of een exception: blijft de lease staan, dan kan deze
    // docent 30 seconden lang zijn logo niet wijzigen.
    await releaseLogoLease(supabase, lease.token);
  }
}

/**
 * DELETE /api/huisstijl/logo
 * Verwijdert het logo uit storage en haalt daarna het pad uit de huisstijl.
 * Onder dezelfde lease als POST, dus nooit tegelijk met een upload.
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

  const lease = await claimLogoLease(supabase);
  if (lease.status === "bezet") {
    return NextResponse.json({ error: LOGO_LEASE_BEZET_MELDING }, { status: 409 });
  }
  if (lease.status === "fout") {
    return NextResponse.json(
      { error: "Er ging iets mis bij het verwijderen van het logo." },
      { status: 500 }
    );
  }

  try {
    // Eerst het object, dan de rij. Die volgorde kan nu pas: de lease sluit
    // uit dat er tussen deze twee stappen een upload van dezelfde docent een
    // nieuw object neerzet dat deze verwijdering meteen weer weghaalt.
    //
    // Deze kant op, omdat "logo verwijderd" niet gemeld hoort te worden zolang
    // het bestand nog in de bucket ligt. Lukt het verwijderen niet, dan stopt
    // deze route met een fout en blijft de rij naar het object wijzen dat er
    // ook echt nog is: één toestand, en opnieuw proberen doet precies hetzelfde.
    // Het object staat buiten de database, dus deze controle kan niet in
    // hetzelfde statement als de verwijdering. Ze voorkomt wat wél te
    // voorkomen is: een aanvraag wiens lease verliep, sloopt hier niet meer het
    // verse object van zijn opvolger. De harde grens blijft de rijmutatie
    // hieronder, die de lease nog eens in hetzelfde statement controleert.
    if (!(await logoLeaseNogGeldig(supabase, lease.token))) {
      console.error("Logo-lease verlopen vóór het verwijderen", { userId: user.id });
      return NextResponse.json({ error: LOGO_LEASE_VERLOPEN_MELDING }, { status: 409 });
    }

    if (!(await verwijderLogoObjecten(supabase, [logoPad(user.id)]))) {
      console.error("Schoollogo-object verwijderen mislukt", { userId: user.id });
      return NextResponse.json(
        { error: "Het logo kon niet verwijderd worden. Probeer het opnieuw." },
        { status: 500 }
      );
    }

    const geschreven = await schrijfLogoMetLease(supabase, lease.token, null, null);

    if (geschreven.status !== "ok") {
      // Het object is al weg en de rij wijst er nog naar. De docent ziet een
      // fout en probeert het opnieuw; die tweede poging verwijdert een object
      // dat er niet meer is (geen fout in storage) en leegt de rij alsnog. In
      // de tussentijd toont geen enkele export een logo: het downloaden faalt
      // en haalLogo() geeft dan null.
      if (geschreven.status === "verlopen") {
        console.error("Logo-lease verlopen vóór het wissen van het pad", {
          userId: user.id,
        });
        return NextResponse.json(
          { error: LOGO_LEASE_VERLOPEN_MELDING },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Er ging iets mis bij het verwijderen van het logo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ huisstijl: resolveHuisstijl(geschreven.rij) });
  } finally {
    await releaseLogoLease(supabase, lease.token);
  }
}
