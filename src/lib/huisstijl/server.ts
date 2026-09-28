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
 * De enige twee objectnamen die een docent in de bucket school-logos kan
 * hebben. Het storage-beleid (zie 20260928120000_facula_huisstijl.sql) staat
 * exact deze twee toe, dus elk opruimpad weet precies wat het kan aantreffen
 * en hoeft niet op een listing te vertrouwen om compleet te zijn.
 */
export function logoPaden(userId: string): string[] {
  return [userId + "/logo.png", userId + "/logo.jpg"];
}

/**
 * Verwijdert één logo-object uit storage. Faalt stil met een log: dit wordt
 * gebruikt om een vervangen logo op te ruimen, waar de rij in de database
 * leidend is en een achtergebleven object hooguit ruimte kost.
 *
 * NIET gebruiken waar een mislukte verwijdering iets betekent: bij het wissen
 * van een logo (DELETE /api/huisstijl/logo) en bij accountverwijdering moet de
 * aanroeper erop kunnen afgaan — zie verwijderLogoObjecten() en
 * verwijderAlleLogoObjecten(), die een boolean teruggeven.
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
 * Verwijdert de opgegeven objecten en geeft terug of dat gelukt is.
 *
 * Paden die niet bestaan zijn geen fout: storage.remove() meldt daar niets
 * over, en dat is hier precies goed — een docent met alleen een png laat de
 * jpg-naam simpelweg leeg.
 */
export async function verwijderLogoObjecten(
  supabase: SupabaseClient,
  paden: string[]
): Promise<boolean> {
  if (paden.length === 0) return true;
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove(paden);
  if (error) {
    console.error("Schoollogo's verwijderen mislukt", { paden, error });
    return false;
  }
  return true;
}

/** Alle bestandsnamen onder '<user_id>/', paginerend tot de map uit is. */
async function lijstLogoObjecten(
  supabase: SupabaseClient,
  userId: string
): Promise<string[] | null> {
  const paginaGrootte = 100;
  const paden: string[] = [];

  for (let offset = 0; ; offset += paginaGrootte) {
    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .list(userId, { limit: paginaGrootte, offset });

    if (error) {
      console.error("Schoollogo-map uitlezen mislukt", error);
      return null;
    }

    const items = data ?? [];
    // Een item zonder id is een map, geen bestand. Die kunnen hier niet
    // voorkomen (het storage-beleid staat alleen de twee namen uit
    // logoPaden() toe), maar remove() zou er wel op stukgaan.
    for (const item of items) {
      if (item.id !== null) paden.push(userId + "/" + item.name);
    }

    if (items.length < paginaGrootte) return paden;

    // Vangnet tegen een listing die blijft doorlopen: bij dit aantal is er
    // iets grondig anders aan de hand dan twee logo's.
    if (offset > 10_000) {
      console.error("Schoollogo-map onverwacht groot", { userId, aantal: paden.length });
      return null;
    }
  }
}

/**
 * Ruimt alles op wat er onder '<user_id>/' in de bucket school-logos staat, en
 * controleert daarna dat de map echt leeg is.
 *
 * Drie lagen, omdat één ervan kan tekortschieten:
 *   1. de twee namen uit logoPaden() altijd expliciet verwijderen, ook als een
 *      listing ze niet teruggeeft (eventual consistency, een lege
 *      listing-respons, of een logo dat wél bestaat maar niet in de index
 *      staat);
 *   2. daarnaast de volledige, paginerende listing van de map, zodat iets wat
 *      er buiten die twee namen om toch in staat mee weggaat;
 *   3. een hercontrole na het verwijderen: pas als de map leeg IS, mag de
 *      aanroeper verder.
 *
 * Geeft false terug als er ook maar iets misging of iets bleef staan. De
 * aanroeper hoort de accountverwijdering dan af te breken: de auth-user
 * weggooien terwijl er nog een bestand van die docent in de bucket staat, laat
 * persoonsgegevens achter die daarna door niemand meer op te ruimen zijn.
 */
export async function verwijderAlleLogoObjecten(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const gelijst = await lijstLogoObjecten(supabase, userId);
  if (gelijst === null) return false;

  const paden = Array.from(new Set([...logoPaden(userId), ...gelijst]));
  if (!(await verwijderLogoObjecten(supabase, paden))) return false;

  const resterend = await lijstLogoObjecten(supabase, userId);
  if (resterend === null) return false;
  if (resterend.length > 0) {
    console.error("Schoollogo-map niet leeg na verwijderen", { userId, resterend });
    return false;
  }
  return true;
}
