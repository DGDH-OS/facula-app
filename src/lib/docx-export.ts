import {
  BorderStyle,
  Document,
  HeadingLevel,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { GeneratedTest } from "./types";
import { slugify } from "./pptx-export";

// Facula kleurpalet (hex zonder '#', zoals 'docx' verwacht)
const MARINE = "16233B";
const GOUD = "B8935A";
const INKT = "2A2620";
const LIJN = "E4D9C3";

function kop(tekst: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: GOUD, space: 4 },
    },
    children: [new TextRun({ text: tekst, color: MARINE, bold: true, size: 32 })],
  });
}

function metaRegel(les: GeneratedTest) {
  return new Paragraph({
    spacing: { after: 300 },
    children: [
      new TextRun({
        text: `${les.input.vak} · ${les.input.niveau} ${les.input.leerjaar} · ${les.vragen.length} vragen · ${les.totaalPunten} punten · circa ${les.tijdsduur} minuten`,
        color: GOUD,
        size: 20,
        italics: true,
      }),
    ],
  });
}

function naamKlasRegel() {
  return new Paragraph({
    spacing: { after: 400 },
    children: [
      new TextRun({ text: "Naam: _________________________________        ", size: 20, color: INKT }),
      new TextRun({ text: "Klas: ___________", size: 20, color: INKT }),
    ],
  });
}

/**
 * Bouwt een bewerkbaar .docx-document op uit een GeneratedTest:
 * pagina 1..n = vragen, aparte pagina = antwoordsleutel.
 */
export function bouwToetsDocument(toets: GeneratedTest): Document {
  const vraagParagrafen: Paragraph[] = [];

  vraagParagrafen.push(kop(toets.titel));
  vraagParagrafen.push(metaRegel(toets));
  vraagParagrafen.push(naamKlasRegel());

  for (const v of toets.vragen) {
    vraagParagrafen.push(
      new Paragraph({
        spacing: { before: 240, after: 80 },
        children: [
          new TextRun({ text: `${v.nummer}. `, bold: true, color: MARINE, size: 22 }),
          new TextRun({ text: v.vraag, size: 22, color: INKT }),
          new TextRun({
            text: `   (${v.punten} ${v.punten === 1 ? "punt" : "punten"})`,
            size: 18,
            color: GOUD,
            italics: true,
          }),
        ],
      })
    );

    if (v.opties && v.opties.length > 0) {
      for (const optie of v.opties) {
        vraagParagrafen.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `${optie.label}. `, bold: true, size: 20, color: INKT }),
              new TextRun({ text: optie.tekst, size: 20, color: INKT }),
            ],
          })
        );
      }
    } else if (v.type === "open") {
      vraagParagrafen.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "___________________________________________________________________",
              size: 20,
              color: LIJN,
            }),
          ],
        })
      );
    } else {
      vraagParagrafen.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Antwoord: ______________________________", size: 20, color: LIJN }),
          ],
        })
      );
    }
  }

  // ---- Antwoordsleutel op een nieuwe pagina ----
  const sleutelParagrafen: Paragraph[] = [
    new Paragraph({ children: [new PageBreak()] }),
    kop("Antwoordsleutel"),
    metaRegel(toets),
  ];

  const sleutelRijen = toets.vragen.map(
    (v) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: "F2EAD9" },
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(v.nummer), bold: true, color: MARINE })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 92, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: v.antwoordsleutel, color: INKT })],
              }),
            ],
          }),
        ],
      })
  );

  const sleutelTabel = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: sleutelRijen,
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...vraagParagrafen],
      },
      {
        properties: {},
        children: [...sleutelParagrafen, sleutelTabel],
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: "Arial" },
        },
      },
    },
  });

  return doc;
}

/**
 * Genereert de .docx en start een browser-download (blob), geen server-opslag.
 */
export async function downloadToetsDocx(toets: GeneratedTest): Promise<void> {
  const doc = bouwToetsDocument(toets);
  const blob = await Packer.toBlob(doc);
  const bestandsnaam = `${slugify(toets.titel)}.docx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bestandsnaam;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
