import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LOGO_BUCKET, schoolLogoPad, verwijderLogoObjecten } from "@/lib/huisstijl/server";
import { isToegestaanLogoType, maakLogo, mimeUitBytes } from "@/lib/huisstijl/logo";
import { normaliseerLogo } from "@/lib/huisstijl/normalize-logo";
import { MAX_LOGO_BYTES } from "@/lib/huisstijl/themes";
import { zelfdeOrigin } from "@/lib/validation";

/**
 * Het schoollogo: één object op 'school/<school_id>/logo' in dezelfde private
 * bucket als het docentlogo.
 *
 * Zelfde bewerking als bij een docent: alleen PNG en JPG, de bestandskop wordt
 * gecontroleerd (niet het opgegeven type), en het logo gaat door sharp heen
 * (gedraaid volgens EXIF, metadata eraf, verkleind). Het origineel wordt niet
 * bewaard.
 *
 * Twee verschillen met /api/huisstijl/logo, beide bewust:
 *
 *   1. De school-id wordt hier NIET uit de aanvraag gelezen. Het pad komt uit
 *      facula.mijn_school_id() en de rijmutatie loopt via
 *      facula.set_school_logo(), die het pad zelf afleidt. Er is dus geen
 *      parameter waarmee een beheerder het logo van een andere school kan
 *      raken; de storage-policy zou dat ook weigeren, maar het is beter als de
 *      vraag niet gesteld kan worden.
 *   2. Geen lease. Bij een docent kon elke gebruiker zijn eigen logo vervangen
 *      en verwijderen, en liepen die twee door elkaar. Hier kan alleen een
 *      beheerder erbij en gebeurt het een paar keer per jaar. Het slechtste
 *      geval van twee beheerders die tegelijk bezig zijn, is een rij die naar
 *      een verwijderd object wijst; de app leest dat als "geen logo" en gaat
 *      gewoon door. Een lease zou daar meer machinerie voor zijn dan het
 *      probleem groot is.
 */

const MAX_AANGEKONDIGDE_BYTES = Math.round(MAX_LOGO_BYTES * 1.1);

/** De school van de ingelogde beheerder, of null. */
async function mijnSchoolId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<string | null> {
  const { data, error } = await supabase.schema("facula").rpc("mijn_school_id");
  if (error) {
    console.error("mijn_school_id mislukt", error);
    return null;
  }
  return typeof data === "string" && data ? data : null;
}

export async function POST(request: NextRequest) {
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

  const aangekondigd = Number(request.headers.get("content-length"));
  if (Number.isFinite(aangekondigd) && aangekondigd > MAX_AANGEKONDIGDE_BYTES) {
    return NextResponse.json({ error: "Het bestand is te groot." }, { status: 413 });
  }

  const schoolId = await mijnSchoolId(supabase);
  if (!schoolId) {
    return NextResponse.json({ error: "Je hoort niet bij een school." }, { status: 403 });
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
  if (bestand.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "Het logo mag maximaal 2 MB zijn." }, { status: 413 });
  }
  if (!isToegestaanLogoType(bestand.type)) {
    return NextResponse.json({ error: "Kies een PNG- of JPG-bestand." }, { status: 415 });
  }

  const bytes = new Uint8Array(await bestand.arrayBuffer());
  const logo = maakLogo(bytes, bestand.type);
  if (!logo) {
    return NextResponse.json(
      { error: "Dit bestand is geen geldige PNG of JPG." },
      { status: 415 }
    );
  }

  const genormaliseerd = await normaliseerLogo(logo.bytes);
  if (!genormaliseerd) {
    return NextResponse.json(
      { error: "Dit bestand kon niet verwerkt worden. Probeer een andere PNG of JPG." },
      { status: 415 }
    );
  }

  const pad = schoolLogoPad(schoolId);

  // Eerst het object, dan de rij: andersom zou een mislukte upload een rij
  // achterlaten die naar een object wijst dat er niet is.
  const { error: uploadFout } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(pad, genormaliseerd.bytes, {
      contentType: genormaliseerd.mimeType,
      upsert: true,
    });

  if (uploadFout) {
    // Een storage-policy die weigert komt hier ook terecht: alleen een
    // beheerder mag naar dit pad schrijven.
    console.error("Schoollogo uploaden mislukt", uploadFout);
    return NextResponse.json(
      { error: "Het uploaden lukte niet. Ben je beheerder van deze school?" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .schema("facula")
    .rpc("set_school_logo", { p_logo_mime: genormaliseerd.mimeType })
    .single();

  if (error || !data) {
    console.error("Schoollogo vastleggen mislukt", error);
    return NextResponse.json(
      { error: "Het logo kon niet worden opgeslagen. Probeer het opnieuw." },
      { status: 500 }
    );
  }

  const rij = data as { logo_path: string | null; logo_mime: string | null };
  return NextResponse.json({ logoPath: rij.logo_path, logoMime: rij.logo_mime });
}

export async function DELETE(request: NextRequest) {
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

  const schoolId = await mijnSchoolId(supabase);
  if (!schoolId) {
    return NextResponse.json({ error: "Je hoort niet bij een school." }, { status: 403 });
  }

  // Eerst het object weg, dan het pad uit de rij. "Logo verwijderd" hoort niet
  // gemeld te worden zolang het bestand nog in de bucket ligt; lukt het
  // verwijderen niet, dan blijft de rij ernaar wijzen en doet opnieuw proberen
  // precies hetzelfde.
  if (!(await verwijderLogoObjecten(supabase, [schoolLogoPad(schoolId)]))) {
    return NextResponse.json(
      { error: "Het logo kon niet verwijderd worden. Probeer het opnieuw." },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .schema("facula")
    .rpc("set_school_logo", { p_logo_mime: null })
    .single();

  if (error) {
    console.error("Schoollogo wissen mislukt", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het verwijderen van het logo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ logoPath: null, logoMime: null });
}

/**
 * GET /api/school/logo
 *
 * Levert het schoollogo als afbeelding, voor de voorvertoning in het
 * beheerpaneel. Elk lid van de school mag het zien (de storage-policy staat
 * select toe voor leden), en de bucket blijft privé: dit is het enige pad
 * waarlangs het object de bucket verlaat.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const schoolId = await mijnSchoolId(supabase);
  if (!schoolId) {
    return NextResponse.json({ error: "Geen logo ingesteld." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .download(schoolLogoPad(schoolId));

  if (error || !data) {
    return NextResponse.json({ error: "Geen logo ingesteld." }, { status: 404 });
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  // Het bestandstype uit de bestandskop en niet uit data.type: die is niet
  // altijd gezet, en een leeg of verkeerd Content-Type maakt van een afbeelding
  // een download die de browser niet toont.
  const logo = maakLogo(bytes, mimeUitBytes(bytes) ?? "");
  if (!logo) {
    console.error("Schoollogo heeft geen herkenbaar bestandstype", { schoolId });
    return NextResponse.json({ error: "Geen logo ingesteld." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(logo.bytes), {
    status: 200,
    headers: {
      "Content-Type": logo.mimeType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
