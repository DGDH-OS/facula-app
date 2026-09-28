import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { GeneratedReport, RapportOutputType } from "./types";
import { slugify } from "./pptx-export";
import type { Logo } from "./huisstijl/logo";
import { bouwHuisstijlHeader } from "./huisstijl/docx-kop";
import {
  exportFont,
  STANDAARD_HUISSTIJL,
  zachteTekstKleur,
  zonderHekje,
  type Huisstijl,
} from "./huisstijl/themes";

/**
 * De rapporttekst als Word-document in de huisstijl van de docent.
 *
 * Tot nu toe kon een rapporttekst alleen gekopieerd worden. Kopiëren werkt,
 * maar plakt de tekst zonder opmaak en kost daarna alsnog werk. Een
 * kant-en-klaar document met het schoollogo erboven scheelt die stap; de
 * kopieerknop blijft bestaan voor wie de tekst ergens in wil plakken.
 */

export interface RapportExportOpties {
  huisstijl?: Huisstijl;
  logo?: Logo | null;
}

const OUTPUT_LABEL: Record<RapportOutputType, string> = {
  rapporttekst: "Rapporttekst",
  oudergesprek: "Verslag oudergesprek",
  oudermail: "Concept oudermail",
};

/** Bouwt het Word-document voor een rapporttekst. */
export function bouwRapportDocument(
  rapport: GeneratedReport,
  opties: RapportExportOpties = {}
): Document {
  const huisstijl = opties.huisstijl ?? STANDAARD_HUISSTIJL;
  const logo = opties.logo ?? null;
  const font = exportFont(huisstijl.lettertype);
  const accent = zonderHekje(huisstijl.accent);
  const tekstKleur = zonderHekje(huisstijl.tekst);
  const zacht = zonderHekje(zachteTekstKleur(huisstijl));

  const kop = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accent, space: 4 } },
    children: [
      new TextRun({
        text: OUTPUT_LABEL[rapport.input.outputType],
        color: accent,
        bold: true,
        size: 32,
        font,
      }),
    ],
  });

  const meta = new Paragraph({
    spacing: { after: 320 },
    children: [
      new TextRun({
        text: "Voor " + rapport.input.leerlingLabel,
        color: zacht,
        size: 20,
        italics: true,
        font,
      }),
    ],
  });

  // De gegenereerde tekst kan lege regels bevatten als alineascheiding. Die
  // gaan hier een-op-een mee: de docent heeft de tekst op het scherm al zo
  // gezien, en een document dat anders is ingedeeld dan de voorvertoning is
  // verwarrender dan een extra witregel.
  const alineas = rapport.tekst.split("\n").map(
    (regel) =>
      new Paragraph({
        spacing: { after: regel.trim() ? 160 : 0 },
        children: [new TextRun({ text: regel, size: 22, color: tekstKleur, font })],
      })
  );

  const header = bouwHuisstijlHeader(huisstijl, logo);

  return new Document({
    sections: [
      {
        properties: {},
        headers: header ? { default: header } : undefined,
        children: [kop, meta, ...alineas],
      },
    ],
    styles: { default: { document: { run: { font } } } },
  });
}

/** Zet de download klaar in de browser. Er wordt niets op de server bewaard. */
export async function downloadRapportDocx(
  rapport: GeneratedReport,
  opties: RapportExportOpties = {}
): Promise<void> {
  const doc = bouwRapportDocument(rapport, opties);
  const blob = await Packer.toBlob(doc);
  const naam = slugify(
    OUTPUT_LABEL[rapport.input.outputType] + " " + rapport.input.leerlingLabel
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = naam + ".docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
