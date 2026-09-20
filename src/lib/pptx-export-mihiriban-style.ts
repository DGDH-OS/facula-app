import path from "path";
import { Automizer, modify } from "pptx-automizer";
import type { GeneratedLesson, LessonPart, LessonSection } from "./types";
import { slugify } from "./pptx-export";
import {
  afdwingenSlideRegels,
  afdwingenVolledigeZin,
  MAX_WOORDEN_PER_DEFINITIE_BULLET,
} from "./slide-content-rules";

/**
 * Bouwt een PowerPoint in Mihiriban's eigen sjabloon-stijl (oranje/terracotta,
 * Rockwell, grunge-titelbalken en cirkel-badges) op basis van
 * src/templates/mihiriban-template.pptx.
 *
 * Techniek: pptx-automizer dupliceert de 9 bestaande sjabloonslides en
 * vervangt alleen de tekst-placeholders (Titel 1 / "Tijdelijke aanduiding
 * voor inhoud 2") — afbeeldingen, achtergrond, kleuren en fonts van het
 * sjabloon blijven volledig intact omdat we nooit een generieke slide bouwen,
 * enkel bestaande sjabloonslides klonen.
 *
 * Sjabloon-slidevolgorde (vast, 9 slides):
 *   1 titel · 2 introductie · 3 leerdoelen · 4 kernbegrippen · 5 casus ·
 *   6 voorbeeld uitgewerkt · 7 opdracht in tweetallen · 8 bespreken · 9 huiswerk
 *
 * De generator (genereerLes) levert per lesdeel 6 secties op: die worden
 * hieronder gemapt naar de 8 content-slides (2 t/m 9) van het sjabloon. Bij
 * meerdere lessen (aantalLessen > 1) wordt dit 9-slides-blok herhaald per
 * lesdeel — elk blok krijgt in de titelslide een "Les N van M"-aanduiding,
 * zodat alle lessen in de output terechtkomen (bug: voorheen alleen
 * onderdelen[0]).
 */

const TEMPLATE_FILE = "mihiriban-template.pptx";
const TEMPLATE_DIR = path.join(process.cwd(), "src", "templates");

const TITEL_SHAPE = "Titel 1";
const INHOUD_SHAPE = "Tijdelijke aanduiding voor inhoud 2";
const ONDERTITEL_SHAPE = "Ondertitel 2";

function vindSectie(secties: LessonSection[], nummerPrefix: string): LessonSection | undefined {
  return secties.find((s) => s.titel.startsWith(nummerPrefix));
}

/**
 * Voor actie-bullets (casus/opdracht/bespreken/huiswerk/introductie): mogen
 * kort en fragmentarisch blijven, generieke 7-woorden-bullet-regel van
 * toepassing.
 */
function alsMultiText(regels: string[]) {
  const gefilterd = afdwingenSlideRegels(regels)
    .map((r) => r.trim())
    .filter(Boolean);
  if (gefilterd.length === 0) {
    return [{ paragraph: {}, text: " " }];
  }
  return gefilterd.map((text) => ({ paragraph: {}, text }));
}

/**
 * Voor content die grammaticaal COMPLEET moet blijven: het volledige leerdoel
 * op de Leerdoelen-slide. Gebruikt afdwingenVolledigeZin i.p.v. de generieke
 * bullet-trim, zodat de zin nooit midden-in wordt afgekapt (bug 2).
 */
function alsMultiTextVolledigeZin(regels: string[]) {
  const gefilterd = regels
    .map((r) => afdwingenVolledigeZin(r))
    .map((r) => r.trim())
    .filter(Boolean);
  if (gefilterd.length === 0) {
    return [{ paragraph: {}, text: " " }];
  }
  return gefilterd.map((text) => ({ paragraph: {}, text }));
}

/**
 * Voor de "Label: definitie"-bullets in de kernbegrippen-sectie: deze zijn al
 * grammaticaal compleet opgebouwd door lesson-generator.ts (met
 * MAX_WOORDEN_PER_DEFINITIE_BULLET). Hier NIET nogmaals door de generieke
 * 7-woorden-bullet-trim halen — dat zou de definitie alsnog midden-in
 * afknippen (bug 3). Wel de maxBullets-limiet en filtering op lege regels
 * behouden, maar met dezelfde ruimere per-bullet/totaal-limiet.
 */
function alsMultiTextDefinities(regels: string[]) {
  const gefilterd = afdwingenSlideRegels(regels, {
    maxWoordenPerBullet: MAX_WOORDEN_PER_DEFINITIE_BULLET,
    maxTotaalWoorden: regels.length * MAX_WOORDEN_PER_DEFINITIE_BULLET,
  })
    .map((r) => r.trim())
    .filter(Boolean);
  if (gefilterd.length === 0) {
    return [{ paragraph: {}, text: " " }];
  }
  return gefilterd.map((text) => ({ paragraph: {}, text }));
}

export async function bouwMihiribanPptxBuffer(les: GeneratedLesson): Promise<Buffer> {
  if (les.onderdelen.length === 0) {
    throw new Error("Les bevat geen onderdelen om te exporteren.");
  }

  const aantalLessen = les.onderdelen.length;

  // Let op: cleanup:true laat pptx-automizer "ongebruikte" media weghalen op
  // basis van slide-relaties — image1.jpeg wordt echter alleen door
  // theme1.xml (achtergrond) gerefereerd en werd daardoor foutief verwijderd.
  // cleanup blijft daarom uit, zodat alle 7 sjabloon-afbeeldingen behouden
  // blijven (geverifieerd met python-pptx/zipfile, zie taakverificatie).
  const automizer = new Automizer({
    templateDir: TEMPLATE_DIR,
    outputDir: undefined,
    removeExistingSlides: true,
  });

  const pres = automizer
    .loadRoot(TEMPLATE_FILE)
    .load(TEMPLATE_FILE, "tpl");

  const voegLesBlokToe = (deel: LessonPart, idx: number) => {
    const leerdoelSectie = vindSectie(deel.secties, "1.");
    const casusSectie = vindSectie(deel.secties, "2.");
    const voorbeeldSectie = vindSectie(deel.secties, "3.");
    const opdrachtSectie = vindSectie(deel.secties, "4.");
    const besprekenSectie = vindSectie(deel.secties, "5.");
    const huiswerkSectie = vindSectie(deel.secties, "6.");

    const kernbegrippenRegels =
      (leerdoelSectie?.inhoud ?? []).length > 1
        ? (leerdoelSectie?.inhoud ?? []).slice(1)
        : les.kernbegrippen;

    // Let op: het volledige leerdoel gaat NIET door alsMultiText (7-woorden-
    // trim) — dat kapte hem eerder af tot "je kunt opnoemen en uitleggen wat"
    // (bug 2, ook hier aanwezig naast de Leerdoelen-slide). Introductie krijgt
    // daarom alleen een korte kernwoorden-regel, het volledige leerdoel staat
    // al ongeknipt op de volgende (Leerdoelen-)slide.
    const introRegels = [
      les.kernbegrippen.length > 0
        ? `Kernbegrippen vandaag: ${les.kernbegrippen.slice(0, 4).join(", ")}`
        : "Zie leerdoel op volgende slide",
    ];

    const ondertitelKort =
      les.kernbegrippen.slice(0, 3).join(", ") || les.titel;
    const lesLabel = aantalLessen > 1 ? `Les ${idx + 1} van ${aantalLessen}` : "Les 1";

    // Slide — titel (per lesdeel, met "Les N van M"-aanduiding bij meerdere lessen)
    pres.addSlide("tpl", 1, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText(`${les.input.vak} ${les.input.niveau} ${les.input.leerjaar}`));
      slide.modifyElement(ONDERTITEL_SHAPE, modify.setText(`${lesLabel} · ${ondertitelKort}`));
    });

    // Slide — introductie
    pres.addSlide("tpl", 2, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Introductie"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(introRegels)));
    });

    // Slide — leerdoelen
    pres.addSlide("tpl", 3, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Leerdoelen"));
      slide.modifyElement(
        INHOUD_SHAPE,
        modify.setMultiText(alsMultiTextVolledigeZin([les.input.leerdoel]))
      );
    });

    // Slide — kernbegrippen
    pres.addSlide("tpl", 4, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Kernbegrippen"));
      slide.modifyElement(
        INHOUD_SHAPE,
        modify.setMultiText(alsMultiTextDefinities(kernbegrippenRegels))
      );
    });

    // Slide — casus
    pres.addSlide("tpl", 5, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText(`Casus: ${les.input.vak.toLowerCase()}`));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(casusSectie?.inhoud ?? [])));
    });

    // Slide — voorbeeld uitgewerkt
    pres.addSlide("tpl", 6, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Voorbeeld uitgewerkt"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(voorbeeldSectie?.inhoud ?? [])));
    });

    // Slide — opdracht in tweetallen
    pres.addSlide("tpl", 7, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Opdracht in tweetallen"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(opdrachtSectie?.inhoud ?? [])));
    });

    // Slide — bespreken
    pres.addSlide("tpl", 8, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Bespreken"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(besprekenSectie?.inhoud ?? [])));
    });

    // Slide — huiswerk
    pres.addSlide("tpl", 9, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Huiswerk"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(huiswerkSectie?.inhoud ?? [])));
    });
  };

  les.onderdelen.forEach((deel, idx) => voegLesBlokToe(deel, idx));

  const zip = await pres.getJSZip();
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return buffer;
}

export function mihiribanBestandsnaam(les: GeneratedLesson): string {
  return `${slugify(les.titel)}-mihiriban.pptx`;
}
