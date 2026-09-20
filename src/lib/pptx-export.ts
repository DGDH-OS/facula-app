import PptxGenJS from "pptxgenjs";
import type { GeneratedLesson } from "./types";
import { afdwingenSlideRegels, trimTitel } from "./slide-content-rules";

// Facula kleurpalet (zie src/app/globals.css) — zonder '#' voor pptxgenjs
const COLORS = {
  ivoor: "FAF6EF",
  ivoorDeep: "F2EAD9",
  marine: "16233B",
  marineDeep: "0D1626",
  groen: "223C30",
  goud: "B8935A",
  inkt: "2A2620",
  lijn: "E4D9C3",
};

/**
 * Bouwt een PptxGenJS-presentatie op uit een GeneratedLesson.
 * Titelslide + één slide per LessonSection (met deel-context in de subtitel).
 */
export function bouwLesPresentatie(les: GeneratedLesson): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "FACULA_16x9", width: 10, height: 5.63 });
  pptx.layout = "FACULA_16x9";
  pptx.author = "Facula";
  pptx.title = les.titel;

  // ---- Titelslide ----
  const title = pptx.addSlide();
  title.background = { color: COLORS.marine };

  title.addShape("rect", {
    x: 0,
    y: 4.9,
    w: 10,
    h: 0.08,
    fill: { color: COLORS.goud },
    line: { type: "none" },
  });

  title.addText(
    `${les.input.vak.toUpperCase()} · ${les.input.niveau.toUpperCase()} ${les.input.leerjaar} · ${les.input.aantalLessen}× ${les.input.lesduur} MIN`,
    {
      x: 0.6,
      y: 0.7,
      w: 8.8,
      h: 0.4,
      fontSize: 12,
      color: COLORS.goud,
      charSpacing: 2,
      fontFace: "Arial",
    }
  );

  title.addText(les.titel, {
    x: 0.6,
    y: 1.4,
    w: 8.8,
    h: 1.6,
    fontSize: 32,
    bold: true,
    color: COLORS.ivoor,
    fontFace: "Georgia",
    valign: "top",
  });

  if (les.kernbegrippen.length > 0) {
    title.addText(les.kernbegrippen.join("   ·   "), {
      x: 0.6,
      y: 3.3,
      w: 8.8,
      h: 1.2,
      fontSize: 13,
      color: COLORS.ivoorDeep,
      fontFace: "Arial",
      italic: true,
    });
  }

  title.addText("Facula", {
    x: 0.6,
    y: 5.05,
    w: 4,
    h: 0.4,
    fontSize: 11,
    color: COLORS.ivoor,
    fontFace: "Arial",
  });

  // ---- Eén slide per sectie, gegroepeerd per lesdeel ----
  for (const deel of les.onderdelen) {
    for (const sectie of deel.secties) {
      const slide = pptx.addSlide();
      slide.background = { color: COLORS.ivoor };

      // gouden accentbalk boven
      slide.addShape("rect", {
        x: 0,
        y: 0,
        w: 10,
        h: 0.12,
        fill: { color: COLORS.goud },
        line: { type: "none" },
      });

      // deel-context (kleine kicker)
      const duurLabel = sectie.duur ? `${sectie.duur} min · ` : "";
      slide.addText(
        `${deel.titel.toUpperCase()} · ${duurLabel}${les.input.vak}`,
        {
          x: 0.5,
          y: 0.35,
          w: 9,
          h: 0.35,
          fontSize: 11,
          color: COLORS.goud,
          charSpacing: 1.5,
          fontFace: "Arial",
        }
      );

      // sectietitel (assertion-zin, afgedwongen woordlimiet)
      slide.addText(trimTitel(sectie.titel), {
        x: 0.5,
        y: 0.75,
        w: 9,
        h: 0.8,
        fontSize: 26,
        bold: true,
        color: COLORS.marine,
        fontFace: "Georgia",
      });

      // scheidingslijn
      slide.addShape("line", {
        x: 0.5,
        y: 1.55,
        w: 9,
        h: 0,
        line: { color: COLORS.lijn, width: 1 },
      });

      // bullets — nogmaals door de content-regels gehaald zodat deze route
      // consistent kort blijft, ongeacht wat de generator aanleverde.
      const inhoudBeperkt = afdwingenSlideRegels(sectie.inhoud);
      if (inhoudBeperkt.length > 0) {
        slide.addText(
          inhoudBeperkt.map((regel) => ({
            text: regel,
            options: {
              bullet: { code: "2014", indent: 20 },
              color: COLORS.inkt,
              fontSize: 15,
              fontFace: "Arial",
              breakLine: true,
              paraSpaceAfter: 10,
            },
          })),
          { x: 0.5, y: 1.8, w: 9, h: 3.4, valign: "top" }
        );
      }

      // paginanummer / footer
      slide.addText(les.titel, {
        x: 0.5,
        y: 5.35,
        w: 6,
        h: 0.25,
        fontSize: 9,
        color: COLORS.inkt,
        fontFace: "Arial",
        transparency: 40,
      });
    }
  }

  return pptx;
}

/**
 * Genereert de .pptx en start een browser-download (blob), geen server-opslag.
 */
export async function downloadLesPptx(les: GeneratedLesson): Promise<void> {
  const pptx = bouwLesPresentatie(les);
  const bestandsnaam = `${slugify(les.titel)}.pptx`;
  await pptx.writeFile({ fileName: bestandsnaam });
}

export function slugify(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "facula-export";
}
