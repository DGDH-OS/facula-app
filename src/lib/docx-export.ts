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
import type { Logo } from "./huisstijl/logo";
import { bouwHuisstijlHeader } from "./huisstijl/docx-kop";
import {
  exportFont,
  lijnKleur,
  STANDAARD_HUISSTIJL,
  zachteTekstKleur,
  zonderHekje,
  type Huisstijl,
} from "./huisstijl/themes";

export interface ToetsExportOpties {
  huisstijl?: Huisstijl;
  /** Alleen meegeven als de docent het logo aan heeft staan. */
  logo?: Logo | null;
}

/**
 * De kleuren en het lettertype van deze toets, afgeleid uit de huisstijl van
 * de docent. Hex zonder '#', de vorm die 'docx' verwacht.
 */
function stijlVan(huisstijl: Huisstijl) {
  return {
    accent: zonderHekje(huisstijl.accent),
    tekst: zonderHekje(huisstijl.tekst),
    zacht: zonderHekje(zachteTekstKleur(huisstijl)),
    lijn: zonderHekje(lijnKleur(huisstijl)),
    vlak: zonderHekje(lijnKleur(huisstijl, 0.12)),
    font: exportFont(huisstijl.lettertype),
  };
}

type Stijl = ReturnType<typeof stijlVan>;

function kop(tekst: string, stijl: Stijl) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: stijl.accent, space: 4 },
    },
    children: [
      new TextRun({
        text: tekst,
        color: stijl.accent,
        bold: true,
        size: 32,
        font: stijl.font,
      }),
    ],
  });
}

function metaRegel(les: GeneratedTest, stijl: Stijl) {
  return new Paragraph({
    spacing: { after: 300 },
    children: [
      new TextRun({
        text: `${les.input.vak} · ${les.input.niveau} ${les.input.leerjaar} · ${les.vragen.length} vragen · ${les.totaalPunten} punten · circa ${les.tijdsduur} minuten`,
        color: stijl.zacht,
        size: 20,
        italics: true,
        font: stijl.font,
      }),
    ],
  });
}

function naamKlasRegel(stijl: Stijl) {
  return new Paragraph({
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: "Naam: _________________________________        ",
        size: 20,
        color: stijl.tekst,
        font: stijl.font,
      }),
      new TextRun({
        text: "Klas: ___________",
        size: 20,
        color: stijl.tekst,
        font: stijl.font,
      }),
    ],
  });
}

/**
 * Bouwt een bewerkbaar .docx-document op uit een GeneratedTest:
 * pagina 1..n = vragen, aparte pagina = antwoordsleutel.
 */
export function bouwToetsDocument(
  toets: GeneratedTest,
  opties: ToetsExportOpties = {}
): Document {
  const huisstijl = opties.huisstijl ?? STANDAARD_HUISSTIJL;
  const stijl = stijlVan(huisstijl);
  const vraagParagrafen: Paragraph[] = [];

  vraagParagrafen.push(kop(toets.titel, stijl));
  vraagParagrafen.push(metaRegel(toets, stijl));
  vraagParagrafen.push(naamKlasRegel(stijl));

  for (const v of toets.vragen) {
    vraagParagrafen.push(
      new Paragraph({
        spacing: { before: 240, after: 80 },
        children: [
          new TextRun({
            text: `${v.nummer}. `,
            bold: true,
            color: stijl.accent,
            size: 22,
            font: stijl.font,
          }),
          new TextRun({ text: v.vraag, size: 22, color: stijl.tekst, font: stijl.font }),
          new TextRun({
            text: `   (${v.punten} ${v.punten === 1 ? "punt" : "punten"})`,
            size: 18,
            color: stijl.zacht,
            italics: true,
            font: stijl.font,
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
              new TextRun({
                text: `${optie.label}. `,
                bold: true,
                size: 20,
                color: stijl.tekst,
                font: stijl.font,
              }),
              new TextRun({ text: optie.tekst, size: 20, color: stijl.tekst, font: stijl.font }),
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
              color: stijl.lijn,
              font: stijl.font,
            }),
          ],
        })
      );
    } else {
      vraagParagrafen.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Antwoord: ______________________________",
              size: 20,
              color: stijl.lijn,
              font: stijl.font,
            }),
          ],
        })
      );
    }
  }

  // ---- Antwoordsleutel op een nieuwe pagina ----
  const sleutelParagrafen: Paragraph[] = [
    new Paragraph({ children: [new PageBreak()] }),
    kop("Antwoordsleutel", stijl),
    metaRegel(toets, stijl),
  ];

  const sleutelRijen = toets.vragen.map(
    (v) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: stijl.vlak },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String(v.nummer),
                    bold: true,
                    color: stijl.accent,
                    font: stijl.font,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 92, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: v.antwoordsleutel,
                    color: stijl.tekst,
                    font: stijl.font,
                  }),
                ],
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

  // De header zit op beide secties, zodat het schoollogo ook boven de
  // antwoordsleutel staat: die wordt los uitgeprint en hoort er dus net zo
  // goed bij als het vragenblad.
  const header = bouwHuisstijlHeader(huisstijl, opties.logo ?? null);
  const headers = header ? { default: header } : undefined;

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers,
        children: [...vraagParagrafen],
      },
      {
        properties: {},
        headers,
        children: [...sleutelParagrafen, sleutelTabel],
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: stijl.font },
        },
      },
    },
  });

  return doc;
}

/**
 * Genereert de .docx en start een browser-download (blob), geen server-opslag.
 */
export async function downloadToetsDocx(
  toets: GeneratedTest,
  opties: ToetsExportOpties = {}
): Promise<void> {
  const doc = bouwToetsDocument(toets, opties);
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
