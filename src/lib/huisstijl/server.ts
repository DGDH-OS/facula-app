import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bestandsExtensie,
  maakLogo,
  mimeUitBytes,
  type Logo,
  type LogoBestand,
} from "./logo";
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

/**
 * Het enige objectpad dat een docent in de bucket school-logos heeft:
 * '<user_id>/logo', zonder extensie.
 *
 * Eén vast pad is de hele reden dat uploads elkaar niet meer kunnen slopen:
 * een upload met upsert overschrijft precies dit object en verwijdert er nooit
 * een ander. Het storage-beleid in 20260928120000_facula_huisstijl.sql staat
 * exact deze naam toe, dus dit is ook wat elk opruimpad kan aantreffen.
 */
export function logoPad(userId: string): string {
  return userId + "/logo";
}

/**
 * Alle objectnamen die van deze docent kunnen zijn. Sinds het ene vaste pad is
 * dat er precies één; de functie blijft bestaan omdat de opruimpaden met een
 * lijst werken en er in oudere installaties nog objecten met een extensie
 * kunnen liggen — die haalt de listing in verwijderAlleLogoObjecten() op.
 */
export function logoPaden(userId: string): string[] {
  return [logoPad(userId)];
}

const LOGO_PAD_VORM =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/logo$/;

/**
 * Of dit pad het logopad van déze docent is.
 *
 * Het pad komt uit de database en de database staat onder RLS, dus het hóórt
 * al te kloppen. Deze controle staat er voor het geval dat niet zo is: een rij
 * uit een oudere versie, een handmatige aanpassing, of een bug die ooit een
 * ander pad wegschrijft. Zonder deze check zou zo'n pad rechtstreeks in een
 * storage-download belanden, en dat is precies het soort onbewaakte
 * doorgeefluik waarmee een pad van iemand anders bruikbaar wordt.
 *
 * Gebruiken bij élk gebruik van een pad uit de database: het uitleveren van
 * het logo, de exports en het opruimen.
 */
export function geldigLogoPad(pad: string | null | undefined, userId: string): boolean {
  if (typeof pad !== "string") return false;
  return LOGO_PAD_VORM.test(pad) && pad === logoPad(userId);
}

/**
 * De Nederlandse melding bij een bezette logo-lease. Staat hier zodat de route
 * en de tests dezelfde tekst gebruiken.
 */
export const LOGO_LEASE_BEZET_MELDING =
  "Er loopt al een wijziging aan je logo, probeer het over een paar seconden opnieuw.";

/**
 * Uitkomst van een claimpoging op de logo-lease.
 *
 * Drie gevallen en niet twee, omdat "bezet" en "de claim zelf ging stuk" een
 * ander antwoord aan de docent verdienen: het eerste is een 409 waar opnieuw
 * proberen echt helpt, het tweede een 500. Ze samennemen zou een kapotte
 * database als drukte laten klinken.
 */
export type LogoLeaseUitkomst = "geclaimd" | "bezet" | "fout";

/**
 * Claimt het recht om het logo van deze docent te wijzigen (30 seconden).
 *
 * Elke mutatie van het logo loopt hierlangs: POST en DELETE op
 * /api/huisstijl/logo raken allebei het object in de bucket én de rij in
 * facula.huisstijl, en die twee zijn niet in één transactie te zetten. Zonder
 * lease kan een verwijdering het object weghalen dat een upload er net heeft
 * neergezet, terwijl de rij ernaar blijft wijzen.
 *
 * Fail-closed: gaat de claim zelf stuk, dan wordt er niets gewijzigd.
 */
export async function claimLogoLease(
  supabase: SupabaseClient
): Promise<LogoLeaseUitkomst> {
  const { data, error } = await supabase.schema("facula").rpc("claim_logo_lock");

  if (error) {
    console.error("Logo-lease claimen mislukt", error);
    return "fout";
  }
  return data === true ? "geclaimd" : "bezet";
}

/**
 * Geeft de logo-lease terug. Hoort in een finally: zonder deze aanroep blijft
 * de lease tot 30 seconden staan en wacht de volgende poging van dezelfde
 * docent voor niets.
 *
 * Mislukt het teruggeven, dan is dat geen fout voor de docent — de lease
 * verloopt zelf — maar wel iets om te zien in de logs.
 */
export async function releaseLogoLease(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.schema("facula").rpc("release_logo_lock");
  if (error) {
    console.error("Logo-lease vrijgeven mislukt", error);
  }
}

/** De kolommen die samen een Huisstijl opleveren. Eén lijst, overal dezelfde. */
export const HUISSTIJL_KOLOMMEN =
  "preset, accent, tekst, achtergrond, lettertype, schoolnaam, logo_path, logo_mime, logo_standaard_aan";

/** De rij van deze docent, of de standaardstijl als er nog geen rij is. */
export async function haalHuisstijl(
  supabase: SupabaseClient,
  userId: string
): Promise<Huisstijl> {
  const { data, error } = await supabase
    .schema("facula")
    .from("huisstijl")
    .select(HUISSTIJL_KOLOMMEN)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Een docent zonder werkende huisstijl hoort gewoon de standaardstijl te
    // krijgen; zijn les mag hier niet op stuklopen.
    console.error("Huisstijl ophalen mislukt", error);
    return STANDAARD_HUISSTIJL;
  }

  const huisstijl = resolveHuisstijl(data);
  // Eén plek waar elk pad uit de database langskomt vóór het iets doet. Een
  // pad dat niet van deze docent is, telt als "geen logo": de rest van de
  // huisstijl blijft gewoon werken, maar er wordt niets mee opgehaald.
  if (huisstijl.logoPath && !geldigLogoPad(huisstijl.logoPath, userId)) {
    console.error("Logopad hoort niet bij deze gebruiker, genegeerd", { userId });
    return { ...huisstijl, logoPath: null, logoMime: null };
  }
  return huisstijl;
}

/**
 * De logobytes uit storage, of null als er geen (bruikbaar) logo is.
 *
 * userId is verplicht en niet af te leiden uit de huisstijl: het pad wordt
 * hier nog eens tegen deze docent gecontroleerd voordat er iets gedownload
 * wordt.
 */
export async function haalLogo(
  supabase: SupabaseClient,
  huisstijl: Huisstijl,
  userId: string
): Promise<Logo | null> {
  if (!geldigLogoPad(huisstijl.logoPath, userId)) return null;

  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .download(logoPad(userId));

  if (error || !data) {
    console.error("Schoollogo ophalen mislukt", error);
    return null;
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  return maakLogo(bytes, logoMimeType(bytes, huisstijl.logoMime));
}

/**
 * Het bestandstype van een opgehaald logo. Het pad draagt geen extensie meer,
 * dus er zijn nog twee bronnen: de bestandskop van het object zelf en de kolom
 * facula.huisstijl.logo_mime.
 *
 * De bytes gaan voor. Ze kunnen per definitie niet verouderd zijn, terwijl de
 * kolom dat wel kan: een upload schrijft eerst het object en daarna de rij, en
 * als die tweede stap stukloopt, staat er een jpeg op het pad terwijl de rij
 * nog 'image/png' zegt. Een Content-Type dat niet bij de bytes past, levert
 * een afbeelding op die de browser weigert te tonen.
 *
 * De kolom is dus de terugval, niet de waarheid: hij helpt bij bytes waar
 * mimeUitBytes geen raad mee weet en houdt in de gegevens-export zichtbaar wat
 * er geüpload is. Lege string als geen van beide iets oplevert; maakLogo
 * weigert die, en dat is de bedoeling.
 */
export function logoMimeType(bytes: Uint8Array, opgeslagen: string | null): string {
  return mimeUitBytes(bytes) ?? opgeslagen ?? "";
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
  huisstijl: Huisstijl,
  userId: string
): Promise<LogoBestand | null> {
  const logo = await haalLogo(supabase, huisstijl, userId);
  if (!logo) return null;
  return schrijfLogoNaarTemp(logo, logoPad(userId));
}

/**
 * Verwijdert de opgegeven objecten en geeft terug of dat gelukt is.
 *
 * Paden die niet bestaan zijn geen fout: storage.remove() meldt daar niets
 * over, en dat is hier precies goed — een docent die nooit een logo uploadde,
 * heeft simpelweg niets op dat pad staan.
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
    // Een item zonder id is een map, geen bestand. Die kan hier niet
    // voorkomen (het storage-beleid staat alleen het pad uit logoPad() toe),
    // maar remove() zou er wel op stukgaan.
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
 *   1. het vaste pad '<user_id>/logo' altijd expliciet verwijderen, ook als
 *      een listing het niet teruggeeft (eventual consistency, een lege
 *      listing-respons, of een logo dat wél bestaat maar niet in de index
 *      staat);
 *   2. daarnaast de volledige, paginerende listing van de map, zodat objecten
 *      uit de oude opzet ('<user_id>/logo.png', '<user_id>/logo.jpg') en al
 *      het andere dat er ooit in beland is, mee weggaan;
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
