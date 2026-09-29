import PptxGenJS from "pptxgenjs";
import type { GeneratedLesson } from "./types";
import { AI_MELDING_EXPORT } from "./ai-transparantie";
import { afdwingenSlideRegels, trimTitel } from "./slide-content-rules";
import type { LogoBestand } from "./huisstijl/logo";
import { passendeAfmeting } from "./huisstijl/logo";
import {
  exportFont,
  lijnKleur,
  STANDAARD_HUISSTIJL,
  zachteTekstKleur,
  zonderHekje,
  type Huisstijl,
} from "./huisstijl/themes";

/**
 * De Facula-PowerPoint, opgebouwd in de huisstijl van de docent.
 *
 * Alle kleuren en het lettertype komen uit de meegegeven Huisstijl en niet
 * meer uit een vaste lijst: wat de docent op /app/huisstijl kiest, is wat er
 * uit de download komt. Zonder huisstijl valt alles terug op de standaardstijl
 * van Facula, dus deze functie blijft bruikbaar met een enkel argument.
 */

/** Grenzen voor het logo rechtsboven, in inch. */
const LOGO_MAX_BREEDTE = 1.1;
const LOGO_MAX_HOOGTE = 0.55;

export interface LesExportOpties {
  huisstijl?: Huisstijl;
  /** Alleen meegeven als de docent het logo aan heeft staan. */
  logo?: LogoBestand | null;
}

export function bouwLesPresentatie(
  les: GeneratedLesson,
  opties: LesExportOpties = {}
): PptxGenJS {
  const huisstijl = opties.huisstijl ?? STANDAARD_HUISSTIJL;
  const logo = opties.logo ?? null;

  const kleur = {
    achtergrond: zonderHekje(huisstijl.achtergrond),
    tekst: zonderHekje(huisstijl.tekst),
    accent: zonderHekje(huisstijl.accent),
    lijn: zonderHekje(lijnKleur(huisstijl)),
    zacht: zonderHekje(zachteTekstKleur(huisstijl)),
  };
  const font = exportFont(huisstijl.lettertype);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "FACULA_16x9", width: 10, height: 5.63 });
  pptx.layout = "FACULA_16x9";
  pptx.author = huisstijl.schoolnaam ?? "Facula";
  pptx.title = les.titel;

  const logoMaat = logo ? passendeAfmeting(logo, LOGO_MAX_BREEDTE, LOGO_MAX_HOOGTE) : null;

  /**
   * Het logo rechtsboven op elke dia. Breedte en hoogte zijn hier al in de
   * juiste verhouding uitgerekend, dus PowerPoint hoeft niets bij te snijden
   * of op te rekken.
   */
  const plaatsLogo = (slide: PptxGenJS.Slide) => {
    if (!logo || !logoMaat) return;
    slide.addImage({
      path: logo.pad,
      x: 10 - 0.5 - logoMaat.breedte,
      y: 0.28,
      w: logoMaat.breedte,
      h: logoMaat.hoogte,
      altText: huisstijl.schoolnaam ? "Logo van " + huisstijl.schoolnaam : "Schoollogo",
    });
  };

  /**
   * De AI-vermelding in de notities van elke dia (AI-verordening art. 50).
   *
   * In de notities en niet op de dia zelf: het bestand moet zijn herkomst
   * meedragen, maar een leerling die naar de beamer kijkt hoeft die regel niet
   * negen keer te lezen. Wie de presentatie opent of afdrukt met notities
   * komt hem wel tegen, en op de titeldia staat hij daarnaast klein in beeld.
   */
  const plaatsAiNotitie = (slide: PptxGenJS.Slide) => {
    slide.addNotes(AI_MELDING_EXPORT);
  };

  /** De schoolnaam klein onderaan, als die is ingevuld. */
  const plaatsSchoolnaam = (slide: PptxGenJS.Slide) => {
    if (!huisstijl.schoolnaam) return;
    slide.addText(huisstijl.schoolnaam, {
      x: 6,
      y: 5.35,
      w: 3.5,
      h: 0.25,
      fontSize: 9,
      color: kleur.zacht,
      fontFace: font,
      align: "right",
    });
  };

  // ---- Titeldia: kleuren omgedraaid, het accent als vlak ----
  const title = pptx.addSlide();
  title.background = { color: kleur.accent };

  title.addShape("rect", {
    x: 0,
    y: 4.9,
    w: 10,
    h: 0.08,
    fill: { color: kleur.achtergrond },
    line: { type: "none" },
  });

  title.addText(les.titel, {
    x: 0.6,
    y: 1.4,
    w: 8.8,
    h: 1.6,
    fontSize: 32,
    bold: true,
    color: kleur.achtergrond,
    fontFace: font,
    valign: "top",
  });

  const kicker =
    les.input.vak.toUpperCase() +
    " \u00b7 " +
    les.input.niveau.toUpperCase() +
    " " +
    les.input.leerjaar +
    " \u00b7 " +
    les.input.aantalLessen +
    "\u00d7 " +
    les.input.lesduur +
    " MIN";
  title.addText(kicker, {
    x: 0.6,
    y: 0.7,
    w: 7.5,
    h: 0.4,
    fontSize: 12,
    color: kleur.achtergrond,
    charSpacing: 2,
    fontFace: font,
  });

  if (les.kernbegrippen.length > 0) {
    title.addText(les.kernbegrippen.join("   ·   "), {
      x: 0.6,
      y: 3.3,
      w: 8.8,
      h: 1.2,
      fontSize: 13,
      color: kleur.achtergrond,
      fontFace: font,
      italic: true,
    });
  }

  title.addText(huisstijl.schoolnaam ?? "Facula", {
    x: 0.6,
    y: 5.05,
    w: 6,
    h: 0.4,
    fontSize: 11,
    color: kleur.achtergrond,
    fontFace: font,
  });

  // Op de titeldia staat de AI-vermelding ook zichtbaar, klein rechtsonder.
  // Eén keer in beeld is genoeg om te voldoen aan de mededelingsplicht; op de
  // inhoudsdia's blijft het bij de notitie.
  title.addText(AI_MELDING_EXPORT, {
    x: 4.2,
    y: 5.05,
    w: 5.3,
    h: 0.4,
    fontSize: 9,
    color: kleur.achtergrond,
    fontFace: font,
    align: "right",
  });
  plaatsLogo(title);
  plaatsAiNotitie(title);

  // ---- Eén dia per sectie, gegroepeerd per lesdeel ----
  for (const deel of les.onderdelen) {
    for (const sectie of deel.secties) {
      const slide = pptx.addSlide();
      slide.background = { color: kleur.achtergrond };

      // accentbalk boven
      slide.addShape("rect", {
        x: 0,
        y: 0,
        w: 10,
        h: 0.12,
        fill: { color: kleur.accent },
        line: { type: "none" },
      });

      // deel-context (kleine kicker). Smaller zodra er een logo staat, anders
      // zou de regel eronderdoor lopen.
      const duurLabel = sectie.duur ? sectie.duur + " min · " : "";
      slide.addText(
        deel.titel.toUpperCase() + " · " + duurLabel + les.input.vak,
        {
          x: 0.5,
          y: 0.35,
          w: logo ? 7.3 : 9,
          h: 0.35,
          fontSize: 11,
          color: kleur.zacht,
          charSpacing: 1.5,
          fontFace: font,
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
        color: kleur.accent,
        fontFace: font,
      });

      // scheidingslijn
      slide.addShape("line", {
        x: 0.5,
        y: 1.55,
        w: 9,
        h: 0,
        line: { color: kleur.lijn, width: 1 },
      });

      // bullets, nogmaals door de content-regels gehaald zodat deze route
      // consistent kort blijft, ongeacht wat de generator aanleverde.
      const inhoudBeperkt = afdwingenSlideRegels(sectie.inhoud);
      if (inhoudBeperkt.length > 0) {
        slide.addText(
          inhoudBeperkt.map((regel) => ({
            text: regel,
            options: {
              bullet: { code: "2022", indent: 20 },
              color: kleur.tekst,
              fontSize: 15,
              fontFace: font,
              breakLine: true,
              paraSpaceAfter: 10,
            },
          })),
          { x: 0.5, y: 1.8, w: 9, h: 3.4, valign: "top" }
        );
      }

      // voettekst
      slide.addText(les.titel, {
        x: 0.5,
        y: 5.35,
        w: 5.3,
        h: 0.25,
        fontSize: 9,
        color: kleur.zacht,
        fontFace: font,
      });
      plaatsSchoolnaam(slide);
      plaatsLogo(slide);
      plaatsAiNotitie(slide);
    }
  }

  return pptx;
}

/** Maakt van een lestitel een veilige bestandsnaam zonder pad-onderdelen. */
export function slugify(tekst: string): string {
  return (
    tekst
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "facula-export"
  );
}

/**
 * Laat de browser de .pptx downloaden. Draait client-side; pptxgenjs maakt er
 * een blob van en zet een download klaar in de downloadmap van de gebruiker.
 * Er wordt niets op de server bewaard.
 */
export async function downloadLesPptx(
  les: GeneratedLesson,
  opties: LesExportOpties = {}
): Promise<void> {
  const pptx = bouwLesPresentatie(les, opties);
  await pptx.writeFile({ fileName: slugify(les.titel) + ".pptx" });
}
