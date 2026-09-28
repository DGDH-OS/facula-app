import sharp from "sharp";
import { maakLogo, type Logo } from "./logo";

/**
 * Het schoollogo klaarmaken voor opslag. Draait server-side, één keer bij het
 * uploaden, zodat elke export daarna met een klein bestand werkt.
 *
 * Waarom dit hier hoort en niet bij de export: pptxgenjs schrijft het logo
 * één keer per dia weg in plaats van één keer per bestand. Een foto van 3 MB
 * uit een telefoon wordt dan een PowerPoint van tientallen MB's. Eén keer
 * verkleinen bij de upload lost dat voorgoed op, in plaats van bij elke
 * download opnieuw.
 *
 * Wat er gebeurt:
 *   - `rotate()` zonder hoek draait het beeld volgens de EXIF-oriëntatie en
 *     haalt die tag daarna weg. Anders staat een telefoonlogo in Word op zijn
 *     kant, want Word leest EXIF niet.
 *   - metadata gaat eraf: sharp kopieert die alleen als je erom vraagt, en
 *     een logo hoeft geen GPS-locatie van de uploader mee te dragen.
 *   - het beeld past daarna binnen 600x300 px, nooit vergroot.
 *   - de uitvoer is PNG (transparantie blijft), en alleen als die alsnog te
 *     groot is valt hij terug op JPEG op een witte ondergrond. Geen WebP:
 *     pptx en docx verwachten png of jpeg.
 */

export const LOGO_MAX_BREEDTE = 600;
export const LOGO_MAX_HOOGTE = 300;

/** Boven deze grootte stapt de uitvoer over van PNG naar JPEG. */
export const LOGO_DOEL_BYTES = 150 * 1024;

/**
 * Verkleint en normaliseert een al op bestandskop gecontroleerd logo.
 * Geeft null terug als sharp er geen afbeelding in herkent; dat is een
 * geweigerde upload, geen crash.
 */
export async function normaliseerLogo(bytes: Uint8Array): Promise<Logo | null> {
  try {
    const basis = sharp(Buffer.from(bytes), { failOn: "error" })
      .rotate()
      .resize({
        width: LOGO_MAX_BREEDTE,
        height: LOGO_MAX_HOOGTE,
        fit: "inside",
        withoutEnlargement: true,
      });

    const png = await basis
      .clone()
      .png({ palette: true, compressionLevel: 9 })
      .toBuffer();

    if (png.byteLength <= LOGO_DOEL_BYTES) {
      return maakLogo(new Uint8Array(png), "image/png");
    }

    // Te groot als PNG: dan is het geen vlakkenlogo maar een foto-achtig
    // beeld, en daar is JPEG het juiste formaat voor. Transparantie kan JPEG
    // niet, dus die wordt eerst wit gemaakt in plaats van zwart.
    const jpeg = await basis
      .clone()
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82 })
      .toBuffer();

    return maakLogo(new Uint8Array(jpeg), "image/jpeg");
  } catch (err) {
    console.error("Schoollogo normaliseren mislukt", err);
    return null;
  }
}
