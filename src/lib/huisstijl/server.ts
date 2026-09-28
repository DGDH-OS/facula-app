import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bestandsExtensie, maakLogo, type Logo, type LogoBestand } from "./logo";
import { resolveHuisstijl, STANDAARD_HUISSTIJL, type Huisstijl } from "./themes";

/**
 * Server-side kant van de huisstijl: de rij ophalen en het logo uit de
 * (private) bucket school-logos halen.
 *
 * Alles loopt via de meegegeven, al geauthenticeerde client. De user-id komt
 * dus altijd uit de sessie en nooit uit een request-body; RLS en het
 * storage-beleid (map per gebruiker) zijn de tweede laag daaronder.
 */

export const LOGO_BUCKET = "school-logos";

/** De rij van deze docent, of de standaardstijl als er nog geen rij is. */
export async function haalHuisstijl(
  supabase: SupabaseClient,
  userId: string
): Promise<Huisstijl> {
  const { data, error } = await supabase
    .schema("facula")
    .from("huisstijl")
    .select("preset, accent, tekst, achtergrond, lettertype, schoolnaam, logo_path, logo_standaard_aan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Een docent zonder werkende huisstijl hoort gewoon de standaardstijl te
    // krijgen; zijn les mag hier niet op stuklopen.
    console.error("Huisstijl ophalen mislukt", error);
    return STANDAARD_HUISSTIJL;
  }
  return resolveHuisstijl(data);
}

/** De logobytes uit storage, of null als er geen (bruikbaar) logo is. */
export async function haalLogo(
  supabase: SupabaseClient,
  huisstijl: Huisstijl
): Promise<Logo | null> {
  if (!huisstijl.logoPath) return null;

  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .download(huisstijl.logoPath);

  if (error || !data) {
    console.error("Schoollogo ophalen mislukt", error);
    return null;
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  // data.type is wat storage teruggeeft; valt dat weg, dan leiden we het af
  // uit de extensie van het pad dat wij zelf hebben geschreven.
  const mime = data.type || mimeUitPad(huisstijl.logoPath);
  return maakLogo(bytes, mime);
}

function mimeUitPad(logoPath: string): string {
  return logoPath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}

/**
 * Hetzelfde logo, maar weggeschreven naar een tijdelijk bestand.
 *
 * pptxgenjs leest een afbeelding in Node via een bestandspad (`path`) en doet
 * de codering zelf. Een tijdelijk bestand is daarom eenvoudiger en
 * betrouwbaarder dan een signed URL: geen extra netwerkaanroep tijdens het
 * bouwen van de PowerPoint, en dus ook geen export die faalt omdat een URL
 * net verlopen is.
 */
export async function schrijfLogoNaarTemp(logo: Logo, sleutel: string): Promise<LogoBestand> {
  const map = path.join(tmpdir(), "facula-logos");
  await mkdir(map, { recursive: true });
  const veiligeNaam = sleutel.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 80);
  const doel = path.join(map, veiligeNaam + "." + bestandsExtensie(logo.mimeType));
  await writeFile(doel, logo.bytes);
  return { ...logo, pad: doel };
}

/** Het logo als bestand op schijf, of null als er geen logo is. */
export async function haalLogoBestand(
  supabase: SupabaseClient,
  huisstijl: Huisstijl
): Promise<LogoBestand | null> {
  const logo = await haalLogo(supabase, huisstijl);
  if (!logo || !huisstijl.logoPath) return null;
  return schrijfLogoNaarTemp(logo, huisstijl.logoPath);
}

/**
 * Verwijdert één logo-object uit storage. Faalt stil met een log: dit wordt
 * gebruikt om een vervangen of uitgezet logo op te ruimen, waar de rij in de
 * database leidend is en een achtergebleven object hooguit ruimte kost.
 *
 * NIET gebruiken bij accountverwijdering: daar moet een mislukte verwijdering
 * juist hard falen, zie verwijderAlleLogoObjecten().
 */
export async function verwijderLogoObject(
  supabase: SupabaseClient,
  logoPath: string | null
): Promise<void> {
  if (!logoPath) return;
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove([logoPath]);
  if (error) console.error("Schoollogo verwijderen mislukt", error);
}

/**
 * Ruimt alles op wat er onder '<user_id>/' in de bucket school-logos staat.
 *
 * Bewust niet op logo_path uit de huisstijl-rij vertrouwen: die kent maar één
 * bestand, terwijl een eerdere upload (bijvoorbeeld een jpg die later door
 * een png vervangen is) een tweede object achtergelaten kan hebben. Bij het
 * verwijderen van een account moet de hele map leeg, niet alleen het laatst
 * bekende pad.
 *
 * Geeft false terug als er ook maar iets misging. De aanroeper hoort de
 * accountverwijdering dan af te breken: de auth-user weggooien terwijl er nog
 * een bestand van die docent in de bucket staat, laat persoonsgegevens achter
 * die daarna door niemand meer op te ruimen zijn.
 */
export async function verwijderAlleLogoObjecten(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .list(userId, { limit: 100 });

  if (error) {
    console.error("Schoollogo-map uitlezen mislukt", error);
    return false;
  }

  // Een item zonder id is een map, geen bestand. Die kunnen hier niet
  // voorkomen (het storage-beleid staat alleen '<uid>/logo.png' en
  // '<uid>/logo.jpg' toe), maar remove() zou er wel op stukgaan.
  const paden = (data ?? [])
    .filter((item) => item.id !== null)
    .map((item) => userId + "/" + item.name);

  if (paden.length === 0) return true;

  const { error: verwijderFout } = await supabase.storage
    .from(LOGO_BUCKET)
    .remove(paden);

  if (verwijderFout) {
    console.error("Schoollogo's verwijderen mislukt", verwijderFout);
    return false;
  }
  return true;
}
