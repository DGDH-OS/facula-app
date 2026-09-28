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
 * Verwijdert het logo-object uit storage. Faalt bewust stil met een log: dit
 * wordt aangeroepen tijdens accountverwijdering, en een achtergebleven object
 * mag nooit de reden zijn dat een docent zijn account niet kwijt kan.
 */
export async function verwijderLogoObject(
  supabase: SupabaseClient,
  logoPath: string | null
): Promise<void> {
  if (!logoPath) return;
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove([logoPath]);
  if (error) console.error("Schoollogo verwijderen mislukt", error);
}
