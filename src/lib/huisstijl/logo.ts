import { MAX_LOGO_BYTES, TOEGESTANE_LOGO_TYPES } from "./themes";

/**
 * Het schoollogo zoals de exports het nodig hebben: de ruwe bytes plus de
 * echte pixelafmetingen.
 *
 * De afmetingen komen uit de bestandskop en niet uit een browser-API, want
 * dezelfde functie draait server-side (PowerPoint-route) en client-side
 * (Word-download). Zonder de verhouding zou een liggend logo in een vierkant
 * vak uitgerekt worden, en een uitgerekt schoollogo is precies het detail
 * waarop een docent de hele export gaat wantrouwen.
 *
 * Bewust geen inline-gecodeerde afbeelding: `docx` neemt bytes rechtstreeks
 * aan, en `pptxgenjs` leest in Node een bestandspad. Beide bibliotheken doen
 * de codering zelf, dus die stap hoort niet in onze code thuis.
 */

export interface Logo {
  bytes: Uint8Array;
  mimeType: string;
  breedte: number;
  hoogte: number;
}

/** Een logo dat al op schijf staat, klaar voor pptxgenjs `path`. */
export interface LogoBestand extends Logo {
  pad: string;
}

export type LogoMimeType = (typeof TOEGESTANE_LOGO_TYPES)[number];

export function isToegestaanLogoType(mime: string): mime is LogoMimeType {
  return (TOEGESTANE_LOGO_TYPES as readonly string[]).includes(mime);
}

/** De typeaanduiding die `docx` voor een ImageRun verwacht. */
export function docxBeeldType(mimeType: string): "png" | "jpg" {
  return mimeType === "image/png" ? "png" : "jpg";
}

/** De bestandsextensie die bij dit type hoort, zonder punt. */
export function bestandsExtensie(mimeType: string): string {
  return mimeType === "image/png" ? "png" : "jpg";
}

function leesPngAfmetingen(bytes: Uint8Array): { breedte: number; hoogte: number } | null {
  // PNG: 8 bytes kopmarkering, dan een IHDR-chunk met breedte en hoogte als
  // big-endian 32-bits getallen op offset 16 en 20.
  if (bytes.length < 24) return null;
  const kopmarkering = [137, 80, 78, 71, 13, 10, 26, 10];
  if (kopmarkering.some((b, i) => bytes[i] !== b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { breedte: view.getUint32(16), hoogte: view.getUint32(20) };
}

function leesJpegAfmetingen(bytes: Uint8Array): { breedte: number; hoogte: number } | null {
  // JPEG: markers aflopen tot een SOF-segment (start of frame). Daarin staan
  // hoogte en breedte. 0xC4, 0xC8 en 0xCC zijn GEEN frame-headers maar
  // tabellen, en worden dus overgeslagen.
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;

  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    // Vulbytes en markers zonder lengteveld: gewoon doorlopen.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const lengte = view.getUint16(offset + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (offset + 9 >= bytes.length) return null;
      return { hoogte: view.getUint16(offset + 5), breedte: view.getUint16(offset + 7) };
    }
    if (lengte < 2) return null;
    offset += 2 + lengte;
  }
  return null;
}

/** Breedte en hoogte uit de bestandskop, of null als het geen png/jpeg is. */
export function leesAfmetingen(
  bytes: Uint8Array,
  mimeType: string
): { breedte: number; hoogte: number } | null {
  const afmeting =
    mimeType === "image/png" ? leesPngAfmetingen(bytes) : leesJpegAfmetingen(bytes);
  if (!afmeting || afmeting.breedte <= 0 || afmeting.hoogte <= 0) return null;
  return afmeting;
}

/**
 * Bouwt een Logo uit ruwe bytes, of null als het bestand niet klopt. Null is
 * hier geen uitzonderlijk geval: een export zonder logo is prima, een export
 * die struikelt over een kapot logo niet.
 *
 * Dit is tegelijk de inhoudelijke controle op het bestandstype: een bestand
 * dat zich als PNG aandient maar geen geldige PNG-kop heeft, komt hier niet
 * doorheen en gaat dus nooit een upload of een export in.
 */
export function maakLogo(bytes: Uint8Array, mimeType: string): Logo | null {
  if (!isToegestaanLogoType(mimeType)) return null;
  if (bytes.length === 0 || bytes.length > MAX_LOGO_BYTES) return null;
  const afmeting = leesAfmetingen(bytes, mimeType);
  if (!afmeting) return null;
  return { bytes, mimeType, breedte: afmeting.breedte, hoogte: afmeting.hoogte };
}

/**
 * Past het logo in een vak van maxBreedte bij maxHoogte met behoud van de
 * verhouding. De eenheid maakt niet uit (inch voor PowerPoint, pixels voor
 * Word), zolang beide grenzen in dezelfde eenheid staan. Vergroot nooit: een
 * klein logo blijft klein in plaats van korrelig groot te worden.
 */
export function passendeAfmeting(
  logo: Pick<Logo, "breedte" | "hoogte">,
  maxBreedte: number,
  maxHoogte: number
): { breedte: number; hoogte: number } {
  const schaal = Math.min(maxBreedte / logo.breedte, maxHoogte / logo.hoogte, 1);
  return { breedte: logo.breedte * schaal, hoogte: logo.hoogte * schaal };
}
